if (!process.env.VERSION) {
	throw new Error("The game version is missing from the environment variables.");
}
if (!process.env.MODLOADER) {
	throw new Error("The game's modloader is missing from the environment variables.");
}

import { join } from "path";
import { WebSocketServer } from "ws";
import express, { Express,  type Request, type Response } from "express";
import cors from "cors";
import bodyparser from "body-parser";
import { verify, decode } from "jsonwebtoken";
import * as mysql from "mysql2";
import Rcon from "./components/rcon";
import Indexer from "./components/indexFolder";
import queryAsync from "./components/queryAsync";

import type Message from "./types/Message";
import Channel from "./types/Channel";
import Logs from "./components/logs";
import { UnsubscribeClient } from "./components/subscription";
import nodemailer from "nodemailer";
import { HTTP, Socket } from "./types/Route";
import { createHmac } from "crypto";
import connections from "./components/connections";

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

const routes = new Map<string, Socket>();

const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT as any || 81 });
const http = express();

const allowedOrigin = [
	"http://localhost:5173",
	"https://dash.play.sleezzi.fr"
];

http.use(cors({
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		if (allowedOrigin.find((url) => url === origin)) return callback(null, true);
		callback(new Error("The CORS policy for this does not allow access from the specified Origin"), false);
	}
}));
http.use(bodyparser.json());

for (const path of
	Indexer(join(__dirname, "./channels"))
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
	Indexer(join(__dirname, "./routes"))
	.filter((file) => file.type === "file" && file.path.endsWith(".socket.js"))
	.map((file) => file.path)
) {
	const route: Socket = require(path);
	if (!route) {
		console.warn(`Missing export.defaults in ${path}`);
		continue;
	}
	const uri = path.slice(__dirname.length).split("/").slice(1).join("/").slice(0, -".socket.js".length);
	routes.set(uri, route);
}
for (const path of
	Indexer(join(__dirname, "./routes"))
	.filter((file) => file.type === "file" && file.path.endsWith(".http.js"))
	.map((file) => file.path)
) {
	const route: HTTP = require(path);
	if (!route) {
		console.warn(`Missing export.defaults in ${path}`);
		continue;
	}
	const uri = route.uri || path.slice(__dirname.length).split("/").slice(1).join("/").slice(0, -".http.js".length);
	http[route.method.toLowerCase() as keyof Express](uri, (request: Request, response: Response) => {
		if (!request.ip) {
			response.status(403).json({
				status: 403,
				response: "The server was unable to see your IP address."
			});
			return;
		}
		route.execute(
			request as any,
			response
		);
	});
}

wss.on("connection", async (ws, req) => {
	const reply = (code: number, response: any, request: string, id: string | null = null) => {
		ws.send(JSON.stringify({
			id: id,
			request: request,
			response: response,
			status: code
		}));
	}
	const ip = ((): string | null => {
		if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'] as string;
		if (req.headers['x-forwarded-for']) return (req.headers['x-forwarded-for'] as string).split(',')[0] as string;
		if (req.socket.remoteAddress) return req.socket.remoteAddress;
		return null;
	})();
	
	if (!ip) { // Check if the server can see the client's IP address.
		reply(403, "The server is unable to see your IP address. The server cannot accept clients that mask their IP address. The problem may be with your device, the browser you are using, or your internet service provider.", "handshake");
		ws.close(); // Close the connection
		return;
	}
	const username = await new Promise<string>((resolve, error) => {
		const timeout = setTimeout(() => {
			if (username) return;
			ws.close();
			error();
		}, 1000);
		ws.once("message", async (raw) => { // Connection
			try {
				timeout.close();
				const message: Message = JSON.parse(raw.toString());
				if (message.request !== "auth") {
					reply(401, "The server expects the first message you send to it to be a connection message containing your token.", "handshake");
					ws.close();
					error();
					return;
				}
				if (!message.args || typeof message.args !== "object") { // Checks if the client has correctly provided a token in their request
					reply(401, "Invalid token", "handshake");
					ws.close();
					error();
					return;
				}
				
				if (!verify(message.args, process.env.SECRET_KEY || "")) { // Check if the token is valid
					Logs("rejection", "The handcheck with this client and server failed because the client provided an invalid token.", ip);
					reply(401, "Invalid token", "handshake");
					ws.close();
					error();
					return;
				}

				const token = decode(message.args); // Decode the token to obtain the playload. The playload must contain the client's userid
				if (!token || typeof token !== "string") { // Check if the userid is present in the playload. If it is not, it means the server signed a token without including a playload.
					Logs("rejection", "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip);
					reply(401, "We are unable to properly authenticate the user because the token's playload is not readable", "handshake");
					ws.close();
					error();
					return;
				}
				const playload: { username: string, os: string, navigator: string } = JSON.parse(token);
				if (!playload) {
					Logs("rejection", "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip);
					reply(401, "We are unable to properly authenticate the user because the token's playload is not readable", "handshake");
					ws.close();
					error();
					return;
				}
				if (typeof playload.username !== "string") {
					Logs("rejection", "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip);
					reply(401, "The username in the token payload is not valid.", "handshake");
					ws.close();
					error();
					return;
				}

				const ips = await queryAsync( // Retrieves the IPs with which the client has already connected and filters with the current IP, browser and OS of the user.
					"SELECT * FROM user_ip WHERE username = ? AND ip_hash = ? AND os = ? AND navigator = ? LIMIT 1",
					username,
					playload.os.slice(0, 4),
					playload.navigator.slice(0, 10),
					createHmac("sha256", process.env.SECRET_KEY!).update(ip).digest("hex"), // In the database, user IP addresses are hashed to comply with GDPR and as a security measure.
				);
				if (ips.length === 0) { // If the user logs in from a new browser, a new IP address, or a new device
					Logs(username, "The handcheck with this client and server failed because the client connected from a new IP address.", ip);
					reply(403, "You tried to connect using a new IP address.", "handshake");
					ws.close();
					error();
					return;
				}
				const account: { username: string, permissions: number }[] = await queryAsync("SELECT permissions FROM accounts WHERE userid = ? LIMIT 1", username);
				if (account.length === 0) {
					Logs(username, "The handcheck with this client and server failed because the client connected from a new IP address.", ip);
					reply(403, "You tried to connect using a new IP address.", "handshake");
					ws.close();
					error();
					return;
				}
				if (connections.has(username)) { // Checks if the user has already connected to the server
					connections.get(username)!.close("You logged in from another location"); // Disconnect the user's old connection
				}
				connections.set(username, {
					close: (reason) => {
						if (reason) {
							connections.get(username)!.send("client", "disconnection", reason);
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
				reply(200, username, "handshake");
				resolve(username);
			} catch (err) {
				console.error(err);
				error();
			}
		});
	});
	ws.on("message", (raw) => {
		try {
			const message: Message = JSON.parse(raw.toString());
			if (!message.request) {
				Logs("rejection", "The client did not send a valid message to the server.", typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : req.socket.remoteAddress!);
				reply(401, "Invalid request", message.request);
				return;
			}
			if (message.request === "auth") return;
			if (!username || !connections.has(username)) {
				Logs("rejection", "The client sent a message to the server when the server wasn't ready.", typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : req.socket.remoteAddress!);
				reply(501, "The server is not ready", message.request, message.id);
				return;
			}
			const route = routes.get(message.request);
			
			if (!route) {
				Logs(username, "\nThe client sent a message to the server requesting a route that does not exist.", typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : req.socket.remoteAddress!);
				reply(404, "Invalid route", message.request, message.id);
				return;
			}
			Logs(username, `\nThe client sent a message to the server requesting the route ${route.name}. It was therefore correctly redirected to it.`, typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : req.socket.remoteAddress!);
			route(
				{
					username,
					permissions: connections.get(username)!.permissions,
					ip: typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : req.socket.remoteAddress!,
				},
				message.args,
				(status, response) => reply(status, response, message.request, message.id),
			);
		} catch (err) {
			console.error(err);
		}
	});
	ws.once("close", () => {
		if (!username) return;
		UnsubscribeClient(username);
		connections.delete(username);
	});
});

http.listen(process.env.HTTP_PORT as any || 80, "0.0.0.0", () => console.log(`Server HTTP ready on port ${process.env.HTTP_PORT || 80}`));
wss.once("listening", () => console.log(`WebSocket ready on port ${process.env.WEBSOCKET_PORT || 81}`));