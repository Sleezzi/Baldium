import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../../components/queryAsync";

import { createReadStream, createWriteStream } from "fs";
import Logs from "../../../components/logs";
import { checkPermission } from "../../../components/account";
import { authenticate } from "../../../components/account";
import { blocklist, isTransversal } from "../../../components/files/Unauthorized";
import fsExist from "../../../components/files/fsExist";
import { createInterface } from "readline/promises";
import { FastifyReply } from "fastify";
import { decipher } from "../../../components/crypt";
import { join } from "path";

async function flushBatch(
	rawLines: string[],
	res: FastifyReply["raw"]
): Promise<void> {
	const decrypted = await Promise.all(
		rawLines.map(async (line) => {
			try {
				return decipher(line);
			} catch {
				return null;
			}
		})
	);
	
	for (const line of decrypted) {
		if (line === null) continue;

		const chunk = line + "\n";

		const canContinue = res.write(chunk);
		if (!canContinue) {
			await waitForDrain(res);
		}
	}
}

function waitForDrain(res: FastifyReply["raw"]): Promise<void> {
	return new Promise((resolve) => {
		res.once("drain", resolve);
	});
}


const route: HTTP<{
	Headers: {
		cookie: string
	},
	Querystring: {
		user: string,
		file: string
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
				user: {
					type: "string"
				},
				file: {
					type: "string"
				}
			},
			required: ["user", "file"]
		}
	},
	prehandler: async (request, response, done) => {
		if (!request.headers.cookie) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		const token = request.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		if (!token) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		
		const connection = await authenticate(token.split("token=")[1]);
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
					return response.status(401).send({
						status: 401,
						response: "Invalid request"
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "We are unable to properly authenticate the user because the userId is missing from the token's playload",
						status: 401
					});
					break;
				case "MISSING_USERID":
					await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
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
			await Logs(null, "The client attempted to retrieve a log file but did not provide a valid token", request.clientIP);
			response
			.status(401)
			.send({
				response: "Invalid token",
				status: 401
			});
			return;
		}
		if (accounts[0].version !== user.version) {
			await Logs(user.userId, "The client attempted to retrieve a log file but the token is invalid", request.clientIP);
			response
			.status(403)
			.send({
				response: "Invalid token",
				status: 403
			});
			return;
		}
		if (!checkPermission("admin", accounts[0].permissions)) {
			await Logs(user.userId, "The client attempted to retrieve a log file but their account does not have the necessary permissions", request.clientIP);
			response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
			return;
		}

		if (!request.query.user.match(/^[0-9]*$/)) {
			await Logs(user.userId, "The client attempted to retrieve a log file but did not provide a valid userId.", request.clientIP);
			response
			.status(400)
			.send({
				status: 400,
				response: "Invalid request"
			});
			return;
		}
		if (!request.query.file.endsWith(".log")) {
			await Logs(user.userId, "The client attempted to retrieve a log file but did not provide a valid file.", request.clientIP);
			response
			.status(400)
			.send({
				status: 400,
				response: "Invalid request"
			});
			return;
		}
		(request as any).userId = user.userId;

		const path = isTransversal(process.env.LOGS_PATH!, join(request.query.user, request.query.file));
		if (!path) {
			await Logs(user.userId, "The client attempted to retrieve a log file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
			response
			.status(404)
			.send({
				status: 404,
				response: "File don't exists"
			});
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(user.userId, "The client attempted to retrieve a log file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
					response
			.status(404)
			.send({
				status: 404,
				response: "File don't exists"
			});
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(user.userId, "The client attempted to retrieve a log file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", request.clientIP);
				response
				.status(404)
				.send({
					status: 404,
					response: "File don't exists"
				});
				return;
			}
		}

		if (!(await fsExist(path))) {
			response
			.status(404)
			.send({
				status: 404,
				response: "File don't exists"
			});
			return;
		}
		(request as any).path = path;
	},
	handler: async (request, response) => {
		try {
			response.hijack();
			response.raw.setHeader("Content-Type", "application/text");
			response.raw.setHeader("Transfer-Encoding", "chunked");
			response.raw.setHeader("Cache-Control", "no-cache");
			response.raw.writeHead(200);

			const stream = createReadStream(request.path, { encoding: "utf-8" });
			const rl = createInterface({ input: stream, crlfDelay: Infinity });

			let batch: string[] = [];
			
			try {
				for await (const line of rl) {
					if (!line.trim()) continue;
					
					batch.push(line);
					
					if (batch.length >= 20) {
						await flushBatch(batch, response.raw);
						batch = [];
					}
				}
				
				if (batch.length > 0) {
					await flushBatch(batch, response.raw);
				}
			} catch (error) {
				request.log.error(error, "Erreur pendant le streaming des logs");
			} finally {
				rl.close();
				response.raw.end();
			}
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