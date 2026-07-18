import { HTTP } from "../../../types/Route";
import queryAsync from "../../components/queryAsync";

import archiver from "archiver";
import { readdir } from "fs/promises";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { authenticate } from "../../components/account";

const route: HTTP<{
	Headers: {
		authorization: string
	}
}, {
	userId: number
}> = {
	method: "POST",
	schema: {
		headers: {
			type: "object",
			properties: {
				authorization: {
					type: "string"
				}
			},
			required: ["authorization"]
		}
	},
	prehandler: async (request, response, done) => {
		const token = request.headers.authorization;
		if (!token || !token.startsWith("Bearer ")) {
			await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
			return response.status(400).send({
				status: 400,
				response: "Invalid request"
			});
		}
		const connection = await authenticate(token.replace("Bearer ", ""));
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
					return response.status(401).send({
						status: 401,
						response: "Invalid request"
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "MISSING_USERID":
					await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
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
		const userId =  connection.message;
		const account: { permissions: number }[] = await queryAsync("SELECT permission FROM accounts WHERE id = ?", userId);
		if (account.length === 0) {
			await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
			return response.status(401).send({
				response: "Invalid token",
				status: 401
			});
		}
		if (!checkPermission("manage_files", account[0].permissions)) {
			await Logs(userId, "The client attempted to download the file from the world, but their account does not have the necessary permissions", request.ip);
			return response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
		}
		(request as any).userId = userId;
	},
	handler: async (request, response) => {
		try {
			// response.setHeader("Content-Disposition", `attachment; filemename="Backup.zip"`);
			// response.setHeader("Content-Type", "application/zip");

			// const archive = archiver("zip");

			// archive.pipe(response);

			// for (const file of await readdir(`${process.env.SERVER_PATH}/world`, { withFileTypes: true })) {
			// 	if (file.isDirectory()) {
			// 		archive.directory(`${process.env.SERVER_PATH}/world/${file.name}`, file.name);
			// 		continue;
			// 	}
			// 	if (file.isFile()) {
			// 		archive.file(`${process.env.SERVER_PATH}/world/${file.name}`, { name: file.name });
			// 		continue;
			// 	}
			// }
			// archive.finalize();

			// await Logs(request.userId, "The client downloaded the world file", request.ip);
			// archive.once("error", () => response.status(503).json({
			// 	response: "Internal error",
			// 	status: 503
			// }));
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