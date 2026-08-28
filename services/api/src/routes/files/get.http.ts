import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";

import send from "send";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { authenticate } from "../../components/account";
import { isTransversal, blocklist } from "../../components/files/Unauthorized";

const route: HTTP<{
	Headers: {
		cookie: string
	},
	Querystring: {
		path: string
	}
}, {
	userId: number,
	path: string
}> = {
	method: "GET",
	schema: {
		headers: {
			type: "object",
			properties: {
				cookie: {
					type: "string"
				}
			},
			required: ["cookie"]
		},
		querystring: {
			type: "object",
			properties: {
				path: {
					type: "string"
				}
			},
			required: ["path"]
		}
	},
	prehandler: async (request, response, done) => {
		if (!request.headers.cookie) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		const token = request.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		if (!token) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		
		const connection = await authenticate(token.split("token=")[1]);
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						status: 401,
						response: "Invalid request"
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "MISSING_USERID":
					await Logs(null, "The client attempted to read a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				default:
					response.status(500).send({
						response: "Internal error",
						status: 500
					});
					break;
			}
			return;
		}
		const user = connection.message;
		const accounts: { id: string, permissions: number, version: string }[] = await queryAsync("SELECT permissions, version FROM accounts WHERE id = ? LIMIT 1", user.userId);
		if (accounts.length === 0) {
			await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
			return response.status(401).send({
				response: "Invalid token",
				status: 401
			});
		}
		if (accounts[0].version !== user.version) {
			await Logs(user.userId, "The client attempted to upload a file, but the token is invalid", request.clientIP);
			return response
			.status(403)
			.send({
				response: "Invalid token",
				status: 403
			});
		}
		if (!checkPermission("read_files", accounts[0].permissions)) {
			await Logs(user.userId, "The client attempted to upload a file, but their account does not have the necessary permissions", request.clientIP);
			return response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
		}
		(request as any).userId = user.userId;

		const path = isTransversal(process.env.SERVER_PATH!, request.query.path);
		if (!path) {
			await Logs(user.userId, "The client attempted to read a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(404).send({
					status: 404,
					response: "File not found"
				});
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(user.userId, "The client attempted to read a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
					response
					.status(404)
					.send({
						status: 404,
						response: "File not found"
					});
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(user.userId, "The client attempted to read a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(404).send({
					status: 404,
					response: "File not found"
				});
				return;
			}
		}
		(request as any).path = path;
	},
	handler: async (request, response) => {
		try {
			const stream = send(
				request.raw,
				request.path,
				{
					index: false,
					dotfiles: "allow"
				}
			);

			stream.on("error", (err) => {
				console.error(err);
				response.code(err.status || 500).send({ status: 500, response: "Internal error" });
			});

			stream.on("directory", () => {
				response.code(404).send({ status: 404, response: "File not found" });
			});

			stream.pipe(response.raw);
			response.hijack();
		} catch (err) {
			console.error(err);
			return response.status(500).send({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;