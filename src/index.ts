console.log("Starting...");

if (!process.env.VERSION) {
	throw new Error("The game version is missing from the environment variables.");
}
if (!process.env.MODLOADER) {
	throw new Error("The game's modloader is missing from the environment variables.");
}
if (!process.env.SECRET_KEY) {
	throw new Error("The key used to encrypt/hash the data is not present in the environment variables.");
}

import { join } from "path";
import { WebSocketServer } from "ws";
import express, { Express,  type Request, type Response } from "express";
import cors from "cors";
import * as mysql from "mysql2";
import Rcon from "./components/rcon";
import Indexer from "./components/indexFolder";
import queryAsync from "./components/queryAsync";

import type Message from "./types/Message";
import Channel from "./types/Channel";
import Logs from "./components/logs";
import { Trigger, UnsubscribeClient } from "./components/subscription";
import nodemailer from "nodemailer";
import { HTTP, Socket } from "./types/Route";
import { createHmac } from "crypto";
import connections from "./components/connections";
import verifyIP from "./components/verifyIP";
import auth from "./components/auth";
import Middleware from "./types/Middleware";

export const db = mysql.createPool({
	host: process.env.DATABASE_HOST,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	waitForConnections: true,
	connectionLimit: 3,
	queueLimit: 0
});

export const rcon = new Rcon({
	host: process.env.MINECRAFT_IP || "localhost",
	password: process.env.MINECRAFT_PASSWORD || "",
	port: process.env.MINECRAFT_PORT as any || 25565,
});

export const mail = nodemailer.createTransport({
	host: process.env.MAIL_HOST,
	port: process.env.MAIL_PORT,
	secure: true,
	auth: {
		user: process.env.MAIL,
		pass: process.env.MAIL_PASSWORD
	}
} as any);

// Stores socket routes indexed by their URI-like key (e.g. "accounts/about").
const routes = new Map<string, Socket>();

const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT as any || 81 });
const http = express();

http.set("trust proxy", process.env.TRUSTED_PROXY);

/**
 * Bootstraps middleware, background channels, and HTTP/WebSocket routes by
 * loading compiled files dynamically from the dist tree.
 */
(async () => {
	for (const path of
		(await Indexer(join(__dirname, "./middleware")))
		.filter((file) => file.type === "file" && file.path.endsWith(".js"))
		.map((file) => file.path)
	) {
		const middleware: Middleware = require(path);
		if (!middleware) {
			console.warn(`Missing export.defaults in ${path}`);
			continue;
		}
		http.use(middleware);
		
		console.log(`Middleware "${path}" instancied`);
	}

	for (const path of
		(await Indexer(join(__dirname, "./channels")))
		.filter((file) => file.type === "file" && file.path.endsWith(".js"))
		.map((file) => file.path)
	) {
		const channel: Channel = require(path);
		if (!channel) {
			console.warn(`Missing export.defaults in ${path}`);
			continue;
		}
		
		if (!("name" in channel)) continue;
		if (!("execute" in channel)) continue;
		channel.execute();
		
		console.log(`Channel "${channel.name}" instancied`);
	}

	for (const path of
		(await Indexer(join(__dirname, "./routes")))
		.filter((file) => file.type === "file" && file.path.endsWith(".socket.js"))
		.map((file) => file.path)
	) {
		const route: Socket = require(path);
		if (!route) {
			console.warn(`Missing export.defaults in ${path}`);
			continue;
		}
		const uri = path.slice(join(__dirname, "./routes").length + 1, -".socket.js".length); // from /routes/accounts/login.socket.js to accounts/login
		routes.set(uri, route);
		console.log(`Route "${uri}" instancied in the socket`);
	}
	for (const path of
		(await Indexer(join(__dirname, "./routes")))
		.filter((file) => file.type === "file" && file.path.endsWith(".http.js"))
		.map((file) => file.path)
	) {
		const route: HTTP = require(path);
		if (!route) {
			console.warn(`Missing export.defaults in ${path}`);
			continue;
		}
		const uri = route.uri || path.slice(join(__dirname, "./routes").length, -".http.js".length);
		http[route.method.toLowerCase() as keyof Express](uri, (request: Request, response: Response) => {
			route.execute(
				request as any,
				response
			);
		});
		console.log(`Route "${uri}" instancied in http`);
	}
})();

/**
 * Handles a websocket client lifecycle:
 * - resolves and validates client IP
 * - performs authentication handshake
 * - verifies known device/IP entry
 * - dispatches subsequent socket route messages
 * - cleans subscriptions/connections on disconnect
 */
wss.on("connection", async (ws, req) => {
	try {
		// Normalizes outgoing responses to the message envelope expected by clients.
		const reply = (code: number, response: any, request: string, id: string | null = null) => {
			try {
				ws.send(JSON.stringify({
					id: id,
					request: request,
					response: response,
					status: code
				}));
			} catch (err) {
				console.error(err);
			}
		}
		// Extracts client IP from trusted proxy headers with socket fallback.
		const ip = ((): string | null => {
			if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'] as string;
			if (req.headers['x-forwarded-for']) return (req.headers['x-forwarded-for'] as string).split(',')[0] as string;
			if (req.socket.remoteAddress) return req.socket.remoteAddress;
			return null;
		})()!;
		
		const ipdata = await verifyIP(ip);

		if (!ipdata || !ipdata.isAllowed) { // Check if the server can see the client's IP address.
			reply(403, "The server is unable to see your IP address. The server cannot accept clients that mask their IP address. The problem may be with your device, the browser you are using, or your internet service provider.", "handshake");
			ws.close(); // Close the connection
			return;
		}
		// First websocket frame must be an "auth" message. This promise gates route handling.
		const userId = await new Promise<number>((resolve, error) => {
			const timeout = setTimeout(() => {
				ws.close();
				error();
			}, 500);
			ws.once("message", async (raw) => { // Connection
				try {
					timeout.close();
					const message: Message = JSON.parse(raw.toString());
					if (message.request !== "auth") {
						reply(401, "The server expects the first message you send to it to be a connection message containing your token.", message.request, message.id);
						ws.close();
						error();
						return;
					}
					if (!message.args || typeof message.args !== "string") { // Checks if the client has correctly provided a token in their request
						reply(401, "Invalid token", message.request, message.id);
						ws.close();
						error();
						return;
					}
					const isValid = await auth(message.args);
					if (!isValid.success) {
						switch (isValid.message) {
							case "INVALID_TOKEN":
								await Logs(null, "The handcheck with this client and server failed because the client provided an invalid token.", ip!);
								reply(403, "Invalid token", message.request, message.id);
								break;
							case "MISSING_PAYLOAD":
								await Logs(null, "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip!);
								reply(403, "We are unable to properly authenticate the user because the token's payload is not readable", message.request, message.id);
								break;
							case "INVALID_PAYLOAD":
								await Logs(null, "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip!);
								reply(403, "We are unable to properly authenticate the user because the token's payload is not readable", message.request, message.id);
								break;
							case "MISSING_USERID":
								await Logs(null, "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip!);
								reply(403, "We are unable to properly authenticate the user because the token's payload is not readable", message.request, message.id);
								break;
							default:
								reply(500, "Internal error", message.request, message.id);
								break;
						}
						ws.close();
						error();
						return;
					}
					const _userId = isValid.message;
					const ips = await queryAsync( // Retrieves the IPs with which the client has already connected and filters with the current IP, browser and OS of the user.
						"SELECT * FROM user_ip WHERE userId = ? AND ip_hash = ? LIMIT 1",
						_userId,
						createHmac("sha256", process.env.SECRET_KEY!).update(ip).digest("hex"), // In the database, user IP addresses are hashed to comply with GDPR and as a security measure.
					);
					
					if (ips.length === 0) { // If the user logs in from a new browser, a new IP address, or a new device
						await Logs(_userId, "The handcheck with this client and server failed because the client connected from a new IP address.", ip!);
						reply(403, "You tried to connect using a new IP address.", message.request, message.id);
						ws.close();
						error();
						return;
					}
					const account: { id: number, permissions: number }[] = await queryAsync("SELECT permissions FROM accounts WHERE id = ? LIMIT 1", _userId);
					if (account.length === 0) {
						await Logs(_userId, "The handcheck with this client and server failed because the client connected from a new IP address.", ip!);
						reply(403, "It appears that your account has been deleted.", message.request, message.id);
						ws.close();
						error();
						return;
					}
					if (connections.has(_userId)) { // Checks if the user has already connected to the server
						connections.get(_userId)!.close("You logged in from another location"); // Disconnect the user's old connection
					}
					connections.set(_userId, {
						close: (reason) => {
							if (reason) {
								Trigger("client", {
									userId: _userId,
									reason: "disconnection",
									args: reason
								});
							}
							ws.close();
						},
						send: (message, service, object) => {
							ws.send(JSON.stringify({
								request: "unsolicited-message",
								message: message,
								service: service,
								object: object,
							}));
						},
						permissions: account[0].permissions
					});
					reply(200, { userId: _userId, permissions: account[0].permissions }, message.request, message.id);
					resolve(_userId);
				} catch (err) {
					console.error(err);
					error();
				}
			});
		});
		ws.on("message", async (raw) => {
			try {
				const message: Message = JSON.parse(raw.toString());
				if (!message.request) {
					await Logs(null, "The client did not send a valid message to the server.", ip);
					reply(401, "Invalid request", message.request, message.id);
					return;
				}
				if (message.request === "auth") return;
				if (!userId || !connections.has(userId)) {
					await Logs(null, "The client sent a message to the server when the server wasn't ready.", ip);
					reply(501, "The server is not ready", message.request, message.id);
					return;
				}
				if (!routes.has(message.request)) {
					await Logs(userId, "\nThe client sent a message to the server requesting a route that does not exist.", ip);
					reply(404, "Invalid route", message.request, message.id);
					return;
				}
				const route = routes.get(message.request)!;
				
				await Logs(userId, `\nThe client sent a message to the server requesting the route ${message.request}. It was therefore correctly redirected to it.`, ip);
				route(
					{
						userId: userId,
						permissions: connections.get(userId)!.permissions,
						ip: ip,
					},
					message.args,
					(status, response) => reply(status, response, message.request, message.id),
				);
			} catch (err) {
				console.error(err);
			}
		});
		ws.once("close", () => {
			try {
				if (!userId) return;
				UnsubscribeClient(userId);
				connections.delete(userId);
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
	}
});


http.listen(process.env.HTTP_PORT as any || 80, "0.0.0.0", () => console.log(`Server HTTP ready on port ${process.env.HTTP_PORT || 80}`));
wss.once("listening", () => console.log(`WebSocket ready on port ${process.env.WEBSOCKET_PORT || 81}`));