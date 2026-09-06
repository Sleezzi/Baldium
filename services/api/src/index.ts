if (!process.env.VERSION) {
	throw new Error("The game version is missing from the environment variables.");
}
if (!process.env.MODLOADER) {
	throw new Error("The game's modloader is missing from the environment variables.");
}
if (!process.env.SECRET_KEY) {
	throw new Error("The key used to encrypt/hash the data is not present in the environment variables.");
}
if (!process.env.SERVER_PATH) {
	throw new Error("The folder containing the Minecraft server files is not defined.");
}

import { join } from "path";
import { WebSocketServer } from "ws";
import Indexer from "./components/files/indexer";
import queryAsync from "./components/queryAsync";

import "./components/docker";
import Logs from "./components/logs";
import { Trigger, UnsubscribeClient } from "./components/subscription";
import Fastify, { FastifyPluginAsync } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { v4 as uuid } from "uuid";

import type { HTTP, Socket } from "@baldium/shared-types/src/Route";
import connections from "./components/connections";
import { authenticate } from "./components/account";
import { decipher } from "./components/crypt";
import Message from "@baldium/shared-types/src/Message";
import { isCloudflare, isCloudflareIp } from "./components/cloudflare";

// Stores socket routes indexed by their URI-like key (e.g. "accounts/about").
const routes = new Map<string, Socket>();
const wss = new WebSocketServer({ port: process.env.WEBSOCKET_PORT as any || 81 });

const http = Fastify({
	logger: process.env.DEBUG === "TRUE",
	trustProxy: process.env.TRUSTED_PROXY,
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
			console.warn(`[ HTTP ] Missing export.defaults in ${path}`);
			continue;
		}
		await http.register(fastifyPlugin(middleware));

		console.log(`[ HTTP ] Middleware "${path}" instancied`);
	}

	for (const path of
		(await Indexer(join(__dirname, "./routes")))
		.filter((file) => file.type === "file" && file.path.endsWith(".socket.js"))
		.map((file) => file.path)
	) {
		const route: Socket = require(path);
		if (!route) {
			console.warn(`[SOCKET] Missing export.defaults in ${path}`);
			continue;
		}
		const uri = path.slice(join(__dirname, "./routes").length + 1, -".socket.js".length); // from /routes/accounts/login.socket.js to accounts/login
		routes.set(uri, route);
		console.log(`[SOCKET] Route "${uri}" instancied in the socket`);
	}
	for (const path of
		(await Indexer(join(__dirname, "./routes")))
		.filter((file) => file.type === "file" && file.path.endsWith(".http.js"))
		.map((file) => file.path)
	) {
		const route: HTTP = require(path);
		if (!route) {
			console.warn(`[ HTTP ] Missing export.defaults in ${path}`);
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
		console.log(`[ HTTP ] Route ${route.method.toUpperCase()} "${uri}" instancied in http`);
	}

	const port = Number(process.env.HTTP_PORT) || 80;
	await http.listen({ port, host: "0.0.0.0" });
	console.log(`[ HTTP ] Server HTTP ready on port ${port}`);
})();

/**
 * Handles a websocket client lifecycle:
 * - resolves and validates client IP
 * - performs authentication handshake
 * - dispatches subsequent socket route messages
 * - cleans subscriptions/connections on disconnect
 */
wss.on("connection", async (ws, req) => {
	try {
		// Normalizes outgoing responses to the message envelope expected by clients.
		const reply = (code: number, response: any, request: string, id: string | null = null): Promise<void> => new Promise((resolve, error) => {
			try {
				ws.send(JSON.stringify({
					id: id,
					request: request,
					response: response,
					status: code
				}), (err) => {
					if (err) return error(err);
					resolve();
				});
			} catch (err) {
				console.error("[SOCKET]", err);
			}
		});
		
		if (process.env.DEBUG !== "TRUE") {
			const realip = req.headers["x-real-ip"]; // This header is created by NGINX; it allows retrieving the actual IP address, whereas `request.ip` returns only the IP used by Docker.
			
			if (!realip) {
				Logs(null, "A WebSocket connection was blocked because the server failed to retrieve the connection's IP address.", "0");
				await reply(400, "The server cannot determine which IP address you are using.", "auth", null);
				ws.close();
				return;
			}
			if (!isCloudflareIp(realip.toString())) {
				Logs(null, "The IP used does not originate from Cloudflare servers.", "0");
				await reply(403, "You must route this request through Cloudflare's servers.", "auth", null);
				ws.close();
				return;
			}
			if (!req.headers['x-origin-verify']) {
				Logs(null, "The IP used does not originate from Cloudflare servers.", "0");
				await reply(403, "You must route this request through Cloudflare's servers.", "auth", null);
				ws.close();
				return;
			}
			if (!isCloudflare(req.headers['x-origin-verify'].toString())) {
				Logs(null, "The IP used does not originate from Cloudflare servers.", "");
				await reply(403, "You must route this request through Cloudflare's servers.", "auth", null);
				ws.close();
				return;
			}
		}

		// Extracts client IP from trusted proxy headers with socket fallback.
		const ip = ((): string | undefined => {
			if (req.headers['cf-connecting-ip']) return req.headers['cf-connecting-ip'].toString();
			if (process.env.DEBUG === "TRUE") return req.socket.remoteAddress;
		})();

		if (!ip) {
			await reply(400, "The server cannot determine which IP address you are using.", "auth", null);
			console.log("Missing ip");
			ws.close();
			return;
		}
		
		if (!req.headers.cookie) { // Checks if the client has correctly provided a token in their request
			await reply(401, "Missing cookies", "auth", null);
			console.log("Missing cookie");
			ws.close();
			return;
		}
		const token = req.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		
		if (!token) { // Checks if the client has correctly provided a token in their request
			await reply(401, "Missing token in cookies", "auth", null);
			console.log("Missing token");
			ws.close();
			return;
		}
		
		const isValid = await authenticate(token.split("token=")[1]);
		if (!isValid.success) {
			switch (isValid.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The handcheck with this client and server failed because the client provided an invalid token.", ip!);
					await reply(401, "Invalid token", "auth", null);
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip!);
					await reply(403, "We are unable to properly authenticate the user because the token's payload is not readable", "auth", null);
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The handshake with the client failed because the server was unable to decode the token provided by the client.", ip!);
					await reply(403, "We are unable to properly authenticate the user because the token's payload is not readable", "auth", null);
					break;
				case "INVALID_USERID":
					await Logs(null, "The handshake with the client failed because the userId is invalid.", ip!);
					await reply(403, "Unable to authenticate you because the user ID in the token payload is invalid.", "auth", null);
					break;
				case "INVALID_VERSION":
					await Logs(null, "The handshake with the client failed because the version is invalid.", ip!);
					await reply(403, "Unable to authenticate you because the version in the token payload is invalid.", "auth", null);
					break;
				default:
					await reply(500, "Internal error", "auth", null);
					break;
			}
			ws.close();
			return;
		}
		const user = isValid.message;
		
		const accounts: { id: number, username: string, permissions: number, discord: number | null }[] = await queryAsync("SELECT username, permissions, discord FROM accounts WHERE id = ? LIMIT 1", user);
		if (accounts.length === 0) {
			await Logs(user, "The handcheck with this client and server failed because the client tried to login as a deleted account.", ip!);
			await reply(403, "It appears that your account has been deleted.", "auth", null);
			console.log("Missing account");
			ws.close();
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
		if (connections.has(user)) { // Checks if the user has already connected to the server
			connections.get(user)!.close("You logged in from an other device"); // Disconnect the user's old connection
		}
		const connectionId = uuid();
		connections.set(user, {
			close: (reason) => {
				if (!ws.OPEN) return;
				if (reason) {
					Trigger("client", {
						userId: user,
						reason: "disconnection",
						args: reason
					});
				}
				ws.close();
			},
			send: async (message, service, object) => new Promise((resolve, error) => {
				ws.send(JSON.stringify({
					request: "unsolicited-message",
					message: message,
					service: service,
					object: object,
				}), (err) => {
					if (err) return error(err);
					resolve();
				});
			}),
			connectionId: connectionId,
			permissions: account.permissions,
		});

		await reply(200, {
			userId: user,
			username: account.username,
			permissions: account.permissions,
			discord: discord
		}, "auth", null);

		const client = {
			userId: user,
			discord: account.discord
		};

		ws.on("message", async (raw) => {
			try {
				const message: Message = JSON.parse(raw.toString());
				if (!message.request) {
					await Logs(null, "The client did not send a valid message to the server.", ip);
					await reply(401, "Invalid request", message.request, message.id);
					return;
				}
				
				if (!routes.has(message.request)) {
					await Logs(client.userId, "The client sent a message to the server requesting a route that does not exist.", ip);
					await reply(404, "Invalid route", message.request, message.id);
					return;
				}
				const route = routes.get(message.request)!;

				// We re-read the up-to-date permissions from the "connections" map rather than
				// relying on the value captured once at authentication.
				// This allows a permission revocation to take effect immediately
				// on an already open connection.
				const connection = connections.get(client.userId);
				if (!connection) {
					await Logs(client.userId, `The client sent a message via the WebSocket, but their session could not be found in the \`connections\` map.`, ip);
					await reply(403, "Invalid session", message.request, message.id);
					ws.close();
					return;
				}
				
				await Logs(client.userId, `The client sent a message to the server requesting the route ${message.request}. It was therefore correctly redirected to it.`, ip);
				route(
					{
						userId: client.userId,
						discord: client.discord,
						permissions: connection.permissions,
						ip: ip,
					},
					message.args,
					async (status, response) => await reply(status, response, message.request, message.id),
				);
			} catch (err) {
				console.error("[SOCKET]", err);
			}
		});
		ws.once("close", () => {
			try {
				if (!client.userId) return;
				UnsubscribeClient(client.userId);

				const connection = connections.get(user)!.connectionId;
				if (connectionId === connection) connections.delete(client.userId); // If the user logs in twice simultaneously, this verifies that the first session is the one that gets deleted.

				Logs(client.userId, "The client has disconnected from the WebSocket", ip);
			} catch (err) {
				console.error("[SOCKET]", err);
			}
		});
	} catch (err) {
		console.error(`err@@@`, err);
	}
});

wss.once("listening", () => console.log(`[SOCKET] WebSocket ready on port ${process.env.WEBSOCKET_PORT || 81}`));