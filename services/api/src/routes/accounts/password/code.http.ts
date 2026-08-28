import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../../components/queryAsync";

import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import Logs from "../../../components/logs";
import connections from "../../../components/connections";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { Trigger } from "../../../components/subscription";

const route: HTTP<{
	Body: {
		email: string,
		code: string,
		password: string
	}
}> = {
	method: "PUT",
	schema: {
		body: {
			type: "object",
			properties: {
				email: {
					type: "string"
				},
				code: {
					type: "string"
				},
				password: {
					type: "string"
				}
			},
			required: ["email", "code", "password"]
		}
	},
	prehandler: async (request, response) => {
		if (request.body.password.length < 10 || request.body.password.length > 25) {
			await Logs(null, "The client attempted to reset their password, but the new password did not meet the server's expectations.", request.clientIP);
			return response.status(400).send({
				status: 400,
				response: "Invalid password"
			});
		}
	},
	handler: async (request, response) => {
		try {
			const email_hash = createHmac("sha256", process.env.LOW_SECRET_KEY!)
						.update(request.body.email.trim().toLowerCase())
						.digest("hex");
			
			const hashs: { code: string, attempts: number, expireAt: number }[] = await queryAsync("SELECT code, attempts, expireAt FROM recovery WHERE email = ? LIMIT 1", email_hash);
			if (hashs.length === 0) {
				await Logs(null, "The client attempted to reset their password but did not request a reset beforehand.", request.clientIP);
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}
			const accounts: { id: number }[] = await queryAsync("SELECT id FROM accounts WHERE email_hash = ? LIMIT 1", email_hash);
			if (accounts.length === 0) {
				await Logs(null, "The client is in the \"recovery\" table but not in the \"accounts\" table.", request.clientIP);
				await queryAsync("DELETE FROM recovery WHERE email = ? LIMIT 1", email_hash);
				return response.status(403).send({
					status: 403,
					response: "Your account does not exist."
				});
			}
			const account = accounts[0];
			const hash = hashs[0];
			if (hash.attempts > 5) {
				await Logs(account.id, "The client attempted to reset their password but exceeded the maximum number of attempts.", request.clientIP);
				await queryAsync("DELETE FROM recovery WHERE email = ? LIMIT 1", email_hash);
				return response.status(403).send({
					status: 403,
					response: "Max attempts exceeded"
				});
			}
			if (hash.expireAt < Date.now() / 1000) {
				await Logs(account.id, "The client attempted to reset their password but their request expired.", request.clientIP);
				await queryAsync("DELETE FROM recovery WHERE email = ? LIMIT 1", email_hash);
				return response.status(403).send({
					status: 403,
					response: "Code expired"
				});
			}
			const codeFromClientInBuffer = Buffer.from(createHash("sha256").update(request.body.code).digest("hex"));
			const savedCodeInBuffer = Buffer.from(hash.code);
			
			if (codeFromClientInBuffer.length !== savedCodeInBuffer.length) {
				await Logs(account.id, "The client attempted to reset their password, but the code they provided is not the same as the one the server has on file.", request.clientIP);
				await queryAsync("UPDATE recovery SET attempts = ? WHERE email = ? LIMIT 1", hash.attempts + 1, email_hash);
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}

			if (!timingSafeEqual(
				codeFromClientInBuffer,
				savedCodeInBuffer
			)) {
				await Logs(account.id, "The client attempted to reset their password, but the code they provided is not the same as the one the server has on file.", request.clientIP);
				await queryAsync("UPDATE recovery SET attempts = ? WHERE email = ? LIMIT 1", hash.attempts + 1, email_hash);
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}

			const salt = await bcrypt.genSalt();
			
			const version = uuid();
			
			await Logs(account.id, "The client has reset their password.", request.clientIP);
			const hashedPassword = await bcrypt.hash(request.body.password, salt);
			
			await queryAsync("UPDATE accounts SET hash = ?, version = ? WHERE id = ? LIMIT 1", hashedPassword, version, account.id);
			await queryAsync("DELETE FROM recovery WHERE email = ? LIMIT 1", email_hash);
			
			Trigger("client", {
				userId: account.id,
				reason: "password-updated",
			});
			if (connections.has(account.id)) {
				connections.get(account.id)!.close();
			}
			
			return response
			.status(200)
			.send({
				status: 200,
				response: "Success"
			});
		} catch (err) {
			console.error(err);
			return response.status(502).send({
				status: 502,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;