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
import Indexer from "./components/files/indexer";
import queryAsync from "./components/queryAsync";

import type Message from "../types/Message";
import "./components/docker";
import Logs from "./components/logs";
import { Trigger, UnsubscribeClient } from "./components/subscription";
import Fastify, { FastifyPluginAsync } from "fastify";
import type { HTTP, Socket } from "../types/Route";
import connections from "./components/connections";
import { authenticate } from "./components/account";
import { decipher } from "./components/crypt";
import type Client from "../types/Client";

// Stores socket routes indexed by their URI-like key (e.g. "accounts/about").
const routes = new Map<string, Socket>();
const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT as any || 81 });

const http = Fastify({
	trustProxy: !!process.env.TRUSTED_PROXY,
});

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
		const middleware: FastifyPluginAsync = require(path);
		if (!middleware) {
			console.warn(`Missing export.defaults in ${path}`);
			continue;
		}
		await http.register(middleware);

		console.log(`Middleware "${path}" instancied`);
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
		
		http.route({
			method: route.method,
			url: uri,
			schema: route.schema,
			preHandler: route.prehandler,
			handler: route.handler
		});
		console.log(`Route "${uri}" instancied in http`);
	}

	const port = Number(process.env.HTTP_PORT) || 80;
	await http.listen({ port, host: "0.0.0.0" });
	console.log(`Server HTTP ready on port ${port}`);
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
			if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].toString();
			if (req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].toString().split(',')[0];
			if (req.socket.remoteAddress) return req.socket.remoteAddress;
			return null;
		})();
		if (!ip) {
			Logs(null, "A WebSocket connection was blocked because the server failed to retrieve the connection's IP address.", "0");
			ws.close();
			return;
		}
		
		// First websocket frame must be an "auth" message. This promise gates route handling.
		const client = await new Promise<Client>((resolve, error) => {
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
					const isValid = await authenticate(message.args);
					if (!isValid.success) {
						switch (isValid.message) {
							case "INVALID_TOKEN":
								await Logs(null, "The handcheck with this client and server failed because the client provided an invalid token.", ip!);
								reply(401, "Invalid token", message.request, message.id);
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
					
					const accounts: { id: number, username: string, permissions: number, discord: number }[] = await queryAsync("SELECT username, permissions, discord FROM accounts WHERE id = ? LIMIT 1", _userId);
					if (accounts.length === 0) {
						await Logs(_userId, "The handcheck with this client and server failed because the client connected from a new IP address.", ip!);
						reply(403, "It appears that your account has been deleted.", message.request, message.id);
						ws.close();
						error();
						return;
					}
					const account = accounts[0];

					let discord: string | null = null;
					if (account.discord !== null) {
						const tokens: { id: number, access_token: string }[] = await queryAsync("SELECT access_token FROM discord WHERE id = ?", account.discord);
						
						if (tokens.length > 0) {
							discord = decipher(tokens[0].access_token);
						}
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
						permissions: account.permissions
					});
					reply(200, {
						userId: _userId,
						username: account.username,
						permissions: account.permissions,
						discord: discord
					}, message.request, message.id);
					resolve({
						userId: _userId,
						permissions: account.permissions,
						discord: account.discord
					});
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
				if (!client.userId || !connections.has(client.userId)) {
					await Logs(null, "The client sent a message to the server when the server wasn't ready.", ip);
					reply(501, "The server is not ready", message.request, message.id);
					return;
				}
				if (!routes.has(message.request)) {
					await Logs(client.userId, "The client sent a message to the server requesting a route that does not exist.", ip);
					reply(404, "Invalid route", message.request, message.id);
					return;
				}
				const route = routes.get(message.request)!;
				
				await Logs(client.userId, `The client sent a message to the server requesting the route ${message.request}. It was therefore correctly redirected to it.`, ip);
				route(
					{
						...client,
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
				if (!client.userId) return;
				UnsubscribeClient(client.userId);
				connections.delete(client.userId);
				Logs(client.userId, "The client has disconnected from the WebSocket", ip);
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(`err@@@`, err);
	}
});

wss.once("listening", () => console.log(`WebSocket ready on port ${process.env.WEBSOCKET_PORT || 81}`));