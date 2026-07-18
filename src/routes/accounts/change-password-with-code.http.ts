import { HTTP } from "../../../types/Route";
import queryAsync from "../../components/queryAsync";

import bcrypt from "bcrypt";
import Logs from "../../components/logs";
import connections from "../../components/connections";
import { createHash, timingSafeEqual } from "crypto";
import { Trigger } from "../../components/subscription";

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
			await Logs(null, "The client attempted to reset their password, but the new password did not meet the server's expectations.", request.ip);
			return response.status(400).send({
				status: 400,
				response: "Invalid password"
			});
		}
	},
	handler: async (request, response) => {
		try {
			const hashs: { code: string, attempts: number, expireAt: number }[] = await queryAsync("SELECT code, attempts, expireAt FROM recovry WHERE email = ?", request.body.email);
			if (hashs.length === 0) {
				await Logs(null, "The client attempted to reset their password but did not request a reset beforehand.", request.ip);
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}
			const accounts: { id: number }[] = await queryAsync("SELECT id FROM accounts WHERE email = ?", request.body.email.toLowerCase());
			if (accounts.length === 0) {
				await Logs(null, "The client is in the \"recovery\" table but not in the \"accounts\" table.", request.ip);
				await queryAsync("DELETE FROM recovry WHERE email = ?", request.body.email.toLowerCase());
				return response.status(403).send({
					status: 403,
					response: "Your account does not exist."
				});
			}
			const hash = hashs[0];
			if (hash.attempts > 5) {
				await Logs(accounts[0].id, "The client attempted to reset their password but exceeded the maximum number of attempts.", request.ip);
				await queryAsync("DELETE FROM recovry WHERE email = ?", request.body.email.toLowerCase());
				return response.status(403).send({
					status: 403,
					response: "Max attempts exceeded"
				});
			}
			if (hash.expireAt < Date.now() / 1000) {
				await Logs(accounts[0].id, "The client attempted to reset their password but their request expired.", request.ip);
				await queryAsync("DELETE FROM recovry WHERE email = ?", request.body.email.toLowerCase());
				return response.status(403).send({
					status: 403,
					response: "Code expired"
				});
			}
			const codeFromClientInBuffer = Buffer.from(createHash("sha256").update(request.body.code).digest("hex"));
			const savedCodeInBuffer = Buffer.from(hash.code);
			
			if (codeFromClientInBuffer.length !== savedCodeInBuffer.length) {
				await Logs(accounts[0].id, "The client attempted to reset their password, but the code they provided is not the same as the one the server has on file.", request.ip);
				await queryAsync("UPDATE recovry SET attempts = ? WHERE email = ?", hash.attempts + 1, request.body.email.toLowerCase());
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}

			if (!timingSafeEqual(
				codeFromClientInBuffer,
				savedCodeInBuffer
			)) {
				await Logs(accounts[0].id, "The client attempted to reset their password, but the code they provided is not the same as the one the server has on file.", request.ip);
				await queryAsync("UPDATE recovry SET attempts = ? WHERE email = ?", hash.attempts + 1, request.body.email.toLowerCase());
				return response.status(403).send({
					status: 403,
					response: "Invalid code"
				});
			}

			const salt = await bcrypt.genSalt();
			
			await Logs(accounts[0].id, "The client has reset their password.", request.ip);
			const hashedPassword = await bcrypt.hash(request.body.password, salt);
			await queryAsync("UPDATE accounts SET hash = ? WHERE id = ?", hashedPassword, accounts[0].id);
			await queryAsync("DELETE FROM recovry WHERE email = ?", request.body.email.toLowerCase());
			
			Trigger("client", {
				userId: accounts[0].id,
				reason: "password-updated",
			});
			connections.get(accounts[0].id)!.close();
			
			return response.status(200).send({
				status: 200,
				response: "Password changed"
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