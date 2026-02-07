import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { decode, verify } from "jsonwebtoken";
import archiver from "archiver";
import { readdirSync } from "fs";
import Logs from "../../components/logs";
import { Ips } from "../../types/Accounts";
import { createHash, timingSafeEqual } from "crypto";
import checkPermission from "../../components/permissions";

const route: HTTP = {
	method: "GET",
	execute: async (request, response) => {
		try {
			const token = request.headers.authorization;
			if (!token || !token.startsWith("Bearer ")) {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}

			const isValid = verify(token.replace("Bearer ", ""), process.env.SECRET_KEY || "");
			if (!isValid) {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					status: 401,
					response: "Invalid request"
				});
				return;
			}
			const decodedToken = decode(token.replace("Bearer ", ""));
			if (!decodedToken || typeof decodedToken !== "object") {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "We are unable to properly authenticate the user because the username is missing from the token's playload",
					status: 401
				});
				return;
			}
			if (!("username" in decodedToken) || typeof decodedToken.username !== "string") {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "We are unable to properly authenticate the user because the username is missing from the token's playload",
					status: 401
				});
				return;
			}
			const connections: { ips: string }[] = await queryAsync("SELECT ips FROM connections WHERE username = ?", decodedToken.username.toLowerCase());
			if (connections.length === 0) {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
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
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "Invalid token",
					status: 401
				});
				return;
			}
			const account: { username: string, permissions: number }[] = await queryAsync("SELECT permission FROM account WHERE username = ?", decodedToken.username.toLowerCase()) as any;
			if (account.length === 0) {
				Logs("rejection", "The client attempted to download the world file but did not provide a valid token", request.ip);
				response.status(401).json({
					response: "Invalid token",
					status: 401
				});
				return;
			}
			if (!checkPermission("read_files", account[0].permissions)) {
				Logs(account[0].username, "The client attempted to download the file from the world, but their account does not have the necessary permissions", request.ip);
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

			for (const file of readdirSync(`${process.env.SERVER_PATH}/world`, { withFileTypes: true })) {
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

			Logs(account[0].username, "The client downloaded the world file", request.ip);
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