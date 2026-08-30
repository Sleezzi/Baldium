import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";

import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { authenticate } from "../../components/account";
import { blocklist, isNotTraversal } from "../../components/files/Unauthorized";
import fsExist from "../../components/files/fsExist";
import { stat } from "fs/promises";

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
	method: "PUT",
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
			await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		const token = request.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		if (!token) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		
		const connection = await authenticate(token.split("token=")[1]);
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "Invalid token",
						status: 401
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "We are unable to properly authenticate the user because the token's payload is not readable",
						status: 403
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "We are unable to properly authenticate the user because the token's payload is not readable",
						status: 403
					});
					break;
				case "INVALID_USERID":
					await Logs(null, "The handshake with the client failed because the userId is invalid.", request.clientIP);
					response.status(403).send({
						response: "Unable to authenticate you because the user ID in the token payload is invalid.",
						status: 403
					});
					break;
				case "INVALID_VERSION":
					await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "Unable to authenticate you because the version in the token payload is invalid.",
						status: 403
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
		const accounts: { id: string, permissions: number, version: string }[] = await queryAsync("SELECT permissions FROM accounts WHERE id = ? LIMIT 1", user);
		if (accounts.length === 0) {
			await Logs(null, "The client attempted to edit a file but did not provide a valid token", request.clientIP);
			return response.status(401).send({
				response: "Invalid token",
				status: 401
			});
		}
		if (!checkPermission("manage_files", accounts[0].permissions)) {
			await Logs(user, "The client attempted to edit a file, but their account does not have the necessary permissions", request.clientIP);
			return response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
		}
		(request as any).userId = user;

		const path = isNotTraversal(process.env.SERVER_PATH!, request.query.path);
		if (!path) {
			await Logs(user, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(404).send({
					status: 404,
					response: "File not found"
				});
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(user, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
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
				await Logs(user, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(404).send({
					status: 404,
					response: "File not found"
				});
				return;
			}
		}

		if (!(await fsExist(path)) || !(await stat(path)).isFile()) {
			response
			.status(404)
			.send({
				status: 404,
				response: "File not found"
			});
			return;
		}
		(request as any).path = path;
	},
	handler: async (request, response) => {
		try {
			const data = await request.file();
			if (!data) {
				response.status(400).send({ status: 400, response: "No file provided" });
				return;
			}

			const writeStream = createWriteStream(request.path);
			await pipeline(data.file, writeStream);

			response
			.status(200)
			.send({
				status: 200,
				response: "Success"
			});
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