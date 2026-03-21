import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { genSalt, hash } from "bcrypt";
import Logs from "../../components/logs";
import { createHmac } from "crypto";
import generateNewToken from "../../components/generateNewToken";

const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const body: {
				username: string,
				email: string,
				password: string
			} = request.body;
			if (!body) {
				await Logs(null, "The client attempted to register but did not provide a body in their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.username || typeof body.username !== "string") {
				await Logs(null, "The client attempted to register but did not provide a username in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.username.match(/[a-zA-Z0-9\-_]{5,25}/)) {
				await Logs(null, "The client attempted to register but provided an invalid username in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid username"
				});
				return;
			}
			if (!body.email || typeof body.email !== "string") {
				await Logs(null, "The client attempted to register but did not provide an email in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.email.match(/[a-z0-9\.-]{1,}@[a-z0-9\.-]{1,}\.[a-z]{2,5}/)) {
				await Logs(null, "The client attempted to register but provided an invalid email in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid email"
				});
				return;
			}
			if (!body.password || typeof body.password !== "string") {
				await Logs(null, "The client attempted to register but did not provide a password in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (body.password.length > 25 || body.password.length < 10) {
				await Logs(null, "The client attempted to register but provided an invalid password in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid password length"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
			}
			if ((await queryAsync("SELECT username FROM accounts WHERE username = ? OR email = ?", body.username.toLowerCase(), body.email.toLowerCase())).length > 0) {
				await Logs(null, "The client attempted to register, but the username or the email they provided is already taken", request.ip || "Unknow");
				response.status(401).json({
					status: 401,
					response: "This username or this email is already used"
				});
				return;
			}
			const salt = await genSalt();
			
			const hashedPassword = await hash(body.password, salt);
			
			await queryAsync("INSERT INTO accounts (username, email, hash) VALUES (?, ?, ?)", body.username.toLowerCase(), body.email.toLowerCase(), hashedPassword);
			const [account]: [{ id: number }] = await queryAsync("SELECT id FROM accounts WHERE username = ? AND email = ?", body.username.toLowerCase(), body.email.toLowerCase());
			
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
			await Logs(account.id, "The client created an account", request.ip);
			
			response.json({
				status: 200,
				response: generateNewToken(account.id)
			});
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