import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import bcrypt from "bcrypt";
import Logs from "../../components/logs";
import connections from "../../components/connections";
import { createHash, timingSafeEqual } from "crypto";

const route: HTTP = {
	method: "PUT",
	execute: async (request, response) => {
		try {
			const body: { email: string, code: string, password: string } = request.body;
			if (!body) {
				Logs("rejection", "The client attempted to reset their password but did not provide any content in the message", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			
			if (!body.email || typeof body.email !== "string") {
				Logs("rejection", "The client attempted to reset their password but did not provide their email address.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid email"
				});
				return;
			}
			if (!body.code || typeof body.code !== "string") {
				Logs("rejection", "The client attempted to reset their password but did not provide their code.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid code"
				});
				return;
			}
			if (!body.password || typeof body.password !== "string") {
				Logs("rejection", "The client attempted to reset their password but did not provide their new password.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid password"
				});
				return;
			}
			if (body.password.length < 10 || body.password.length > 25) {
				Logs("rejection", "The client attempted to reset their password, but the new password did not meet the server's expectations.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid password"
				});
				return;
			}
			
			const hashs: { code: string, attempts: number, expireAt: number }[] = await queryAsync("SELECT code, attempts, expireAt FROM recovry WHERE email = ?", body.email);
			if (hashs.length === 0) {
				Logs("rejection", "The client attempted to reset their password but did not request a reset beforehand.", request.ip);
				response.status(403).json({
					status: 403,
					response: "Invalid code"
				});
				return;
			}
			const accounts: { username: string }[] = await queryAsync("SELECT username FROM accounts WHERE email = ?", body.email.toLowerCase());
			if (accounts.length === 0) {
				Logs("rejection", "The customer is in the \"recovery\" table but not in the \"accounts\" table.", request.ip);
				response.status(403).json({
					status: 403,
					response: "Your account does not exist."
				});
				await queryAsync("DELETE FROM recovry WHERE email = ?", body.email.toLowerCase());
				return;
			}
			const hash = hashs[0];
			if (hash.attempts > 5) {
				Logs(accounts[0].username, "The client attempted to reset their password but exceeded the maximum number of attempts.", request.ip);
				response.status(403).json({
					status: 403,
					response: "Max attempts exceeded"
				});
				await queryAsync("DELETE FROM recovry WHERE email = ?", body.email.toLowerCase());
				return;
			}
			if (hash.expireAt < Date.now() / 1000) {
				Logs(accounts[0].username, "The client attempted to reset their password but their request expired.", request.ip);
				response.status(403).json({
					status: 403,
					response: "Code expired"
				});
				await queryAsync("DELETE FROM recovry WHERE email = ?", body.email.toLowerCase());
				return;
			}
			const isValid = timingSafeEqual(
				Buffer.from(createHash("sha256").update(body.code).digest("hex")),
				Buffer.from(hash.code)
			);

			if (!isValid) {
				Logs(accounts[0].username, "The client attempted to reset their password, but the code they provided is not the same as the one the server has on file.", request.ip);
				response.status(403).json({
					status: 403,
					response: "Invalid code"
				});
				await queryAsync("UPDATE recovry SET attempts = ? WHERE email = ?", hash.attempts + 1, body.email.toLowerCase());
				return;
			}

			const salt = await bcrypt.genSalt();
			
			Logs(accounts[0].username, "The client has reset their password.", request.ip);
			const hashedPassword = await bcrypt.hash(body.password, salt);
			await queryAsync("UPDATE accounts SET hash = ? WHERE username = ?", hashedPassword, accounts[0].username);
			await queryAsync("UPDATE connections SET ips = [], code = NULL, code_expire_in = NULL WHERE username = ?", hashedPassword, accounts[0].username);
			await queryAsync("DELETE FROM recovry WHERE email = ?", body.email.toLowerCase());
			
			response.status(200).json({
				status: 200,
				response: "Password changed"
			});

			connections.get(accounts[0].username)!.close();
		} catch (err) {
			console.error(err);
			response.status(502).json({
				status: 502,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;