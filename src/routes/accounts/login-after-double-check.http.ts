import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import Logs from "../../components/logs";
import { Connection } from "../../types/Accounts";
import { createHash, timingSafeEqual, createHmac } from "crypto";
import generateNewToken from "../../components/generateNewToken";


const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const body: {
				email: string,
				code: string,
			} = request.body;
			if (!body) {
				await Logs(null, "The client attempted to connect but did not provide a body in their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.email || typeof body.email !== "string") {
				await Logs(null, "The client attempted to log in but did not provide an email in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.code || typeof body.code !== "string") {
				await Logs(null, "The client attempted to log in but did not provide a password in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
			}

			const connections: Connection[] = await queryAsync("SELECT code, code_expire_in, attempts FROM connections WHERE email = ?", body.email.toLowerCase());
			if (connections.length === 0) {
				await Logs(null, "The client attempted to log in, but their account was not found in the database", request.ip);
				response.status(403).json({
					status: 403,
					response: "You have not requested to log in with a code"
				});
				return;
			}
			const connection = connections[0];

			if (connection.code_expire_in - Date.now() / 1000 < 0) {
				await Logs(null, "The client attempted to log in, but their account was not found in the database", request.ip);
				response.status(403).json({
					status: 403,
					response: "This code has expired."
				});
				return;
			}
			const codeFromClientInBuffer = Buffer.from(createHash("sha256").update(body.code).digest("hex"));
			const savedCodeInBuffer = Buffer.from(connection.code);
			if (codeFromClientInBuffer.length !== savedCodeInBuffer.length) {
				response.status(403).json({
					status: 403,
					response: "This code is not valid. After 5 attempts, the code will no longer be valid."
				});
				
				if (connection.attempts > 5) {
					await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", body.email.toLowerCase());
				} else {
					await queryAsync("UPDATE connections SET attempts = attempts + 1 WHERE email = ?", body.email.toLowerCase());
				}
				return;
			}
			
			if (!timingSafeEqual(
				codeFromClientInBuffer,
				savedCodeInBuffer
			)) {
				response.status(403).json({
					status: 403,
					response: "This code is not valid. After 5 attempts, the code will no longer be valid."
				});
				
				if (connection.attempts > 5) {
					await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", body.email.toLowerCase());
				} else {
					await queryAsync("UPDATE connections SET attempts = attempts + 1 WHERE email = ?", body.email.toLowerCase());
				}
				return;
			}

			const [account]: [{ id: number }] = await queryAsync("SELECT id FROM accounts WHERE email = ?", body.email.toLowerCase());
			
			const token = generateNewToken(account.id);

			await Logs(account.id, "The client logged into their account after email verification.", request.ip);

			if (await queryAsync("SELECT COUNT(*) FROM user_ip WHERE userId = ?", account.id) >= 5) {
				await queryAsync("DELETE FROM user_ip WHERE userId = ? ORDER BY last_connection ASC LIMIT 1", account.id);
			}
			const navigators = request.user.navigators.map((navigator) => navigator.name).join("; ");
			await queryAsync("INSERT INTO user_ip (userId, ip, ip_hash, navigators, model, os, last_connection, longitude, latitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
				account.id,
				/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(request.ip) ? `${request.ip.split(".")[0]}.*.*.${request.ip.split(".")[3]}` : `${request.ip.split(":")[0]}:${"****:".repeat(request.ip.split(":").slice(1, -1).length)}${request.ip.split(":").at(-1)}`,
				createHmac("sha256", process.env.SECRET_KEY).update(request.ip).digest("hex"),
				navigators.length > 70 ? `${navigators.slice(0, 70 - 3)}...` : navigators,
				request.user.device.model.slice(0, 40),
				request.user.device.os.slice(0, 40),
				Math.floor(Date.now() / 1000),
				request.user.location.long,
				request.user.location.lat,
			);
			await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", body.email.toLowerCase());

			response.json({
				status: 200,
				response: token
			});
		} catch (err) {
			console.error(err);
			response.status(500).json({
				status: 500,
				response: "Internal error",
				err: err
			});
		}
	}
}

module.exports = route;