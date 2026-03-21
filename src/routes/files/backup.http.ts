import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { decode, verify } from "jsonwebtoken";
import archiver from "archiver";
import { readdir } from "fs/promises";
import Logs from "../../components/logs";
import { Ips } from "../../types/Accounts";
import { createHash, timingSafeEqual } from "crypto";
import checkPermission from "../../components/permissions";
import auth from "../../components/auth";

const route: HTTP = {
	method: "GET",
	execute: async (request, response) => {
		try {
			const token = request.headers.authorization;
			if (!token || !token.startsWith("Bearer ")) {
				await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			const connection = await auth(token.replace("Bearer ", ""));
			if (!connection.success) {
				switch (connection.message) {
					case "INVALID_TOKEN":
						await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
						response.status(401).json({
							status: 401,
							response: "Invalid request"
						});
						break;
					case "MISSING_PAYLOAD":
						await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
						response.status(401).json({
							response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
							status: 401
						});
						break;
					case "INVALID_PAYLOAD":
						await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
						response.status(401).json({
							response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
							status: 401
						});
						break;
					case "MISSING_USERID":
						await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
						response.status(401).json({
							response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
							status: 401
						});
						break;
					default:
						response.status(500).json({
							response: "Internal error",
							status: 500
						});
						break;
				}
				return;
			}
			const userId = connection.message;
			const connections: { ips: string }[] = await queryAsync("SELECT ips FROM connections WHERE id = ?", userId);
			if (connections.length === 0) {
				await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "Invalid token",
					status: 401
				});
				return;
			}
			const parsedConnection: Ips[] = JSON.parse(connections[0].ips);
			const currentConnection = parsedConnection
				.find((ip) => timingSafeEqual(
					Buffer.from(createHash("sha256").update(request.ip).digest("hex")),
					Buffer.from(ip.hash)
				));
			if (!currentConnection) {
				await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "Invalid token",
					status: 401
				});
				return;
			}
			const account: { permissions: number }[] = await queryAsync("SELECT permission FROM accounts WHERE id = ?", userId);
			if (account.length === 0) {
				await Logs(null, "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "Invalid token",
					status: 401
				});
				return;
			}
			if (!checkPermission("read_files", account[0].permissions)) {
				await Logs(userId, "The client attempted to download the file from the world, but their account does not have the necessary permissions", request.ip);
				response.status(403).json({
					response: "You can't access to this ressource",
					status: 403
				});
				return;
			}

			response.setHeader("Content-Disposition", `attachment; filemename="Backup.zip"`);
			response.setHeader("Content-Type", "application/zip");

			const archive = archiver("zip");

			archive.pipe(response);

			for (const file of await readdir(`${process.env.SERVER_PATH}/world`, { withFileTypes: true })) {
				if (file.isDirectory()) {
					archive.directory(`${process.env.SERVER_PATH}/world/${file.name}`, file.name);
					continue;
				}
				if (file.isFile()) {
					archive.file(`${process.env.SERVER_PATH}/world/${file.name}`, { name: file.name });
					continue;
				}
			}
			archive.finalize();

			await Logs(userId, "The client downloaded the world file", request.ip);
			archive.once("error", () => response.status(503).json({
				response: "Internal error",
				status: 503
			}));
		} catch (err) {
			console.error(err);
			response.status(500).json({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;