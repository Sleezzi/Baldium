import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components//queryAsync";

import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import Logs from "../../components//logs";
import { checkPermission } from "../../components//account";
import { authenticate } from "../../components//account";
import { blocklist, isTransversal } from "../../components//files/Unauthorized";
import fsExist from "../../components//files/fsExist";
import { Trigger } from "../../components/subscription";

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
	method: "POST",
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
			await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		const token = request.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		if (!token) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		
		const connection = await authenticate(token.split("token=")[1]);
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
					return response.status(401).send({
						status: 401,
						response: "Invalid request"
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "MISSING_USERID":
					await Logs(null, "The client attempted to upload a file but did not provide a valid token", request.clientIP);
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
		if (!checkPermission("manage_files", accounts[0].permissions)) {
			await Logs(user.userId, "The client attempted to upload a file, but their account does not have the necessary permissions", request.clientIP);
			return response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
		}
		(request as any).userId = user.userId;

		const path = isTransversal(process.env.SERVER_PATH!, request.query.path);
		if (!path) {
			await Logs(user.userId, "The client attempted to upload a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(403).send({
					status: 403,
					response: "Uploading this type of file is not allowed."
				});
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(user.userId, "The client attempted to upload a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
					response
					.status(403)
					.send({
						status: 403,
						response: "Uploading this type of file is not allowed."
					});
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(user.userId, "The client attempted to upload a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response.status(403).send({
					status: 403,
					response: "Uploading this type of file is not allowed."
				});
				return;
			}
		}

		if (await fsExist(path)) {
			response
			.status(400)
			.send({
				status: 400,
				response: "File already exists"
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

			const writeStream = createWriteStream(request.path, {
				mode: 0o644 // rw-r--r-- | It's writable only to 1000:1000, for others it in read-only
			});
			await pipeline(data.file, writeStream);


			Trigger("files", {
				action: "folder-created",
				path: request.query.path,
			});

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