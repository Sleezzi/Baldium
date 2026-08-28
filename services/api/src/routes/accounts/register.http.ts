import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";

import { genSalt, hash } from "bcrypt";
import { v4 as uuid } from "uuid";
import Logs from "../../components/logs";
import { generateToken } from "../../components/account";
import { createHmac } from "crypto";
import { cipher } from "../../components/crypt";

const route: HTTP<{
	Body: {
		username: string,
		email: string,
		password: string
	}
}> = {
	method: "POST",
	schema: {
		body: {
			type: "object",
			properties: {
				username: {
					type: "string"
				},
				email: {
					type: "string"
				},
				password: {
					type: "string"
				},
			},
			required: ["username", "email", "password"]
		},
		response: {
			200: {
				type: "object",
				properties: {
					status: {
						type: "number"
					},
					response: {
						type: "string"
					}
				}
			}
		}
	},
	prehandler: async (request, response) => {
		const body = request.body;
		if (!process.env.SECRET_KEY) {
			throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
		}
		if (!body.username.match(/^[a-zA-Z0-9\-_]{5,25}$/)) {
			await Logs(null, "The client attempted to register but provided an invalid username in the body of their request", request.clientIP);
			
			return response.status(400).send({
				status: 400,
				response: "Invalid username"
			});
		}
		if (!body.email.match(/^[a-z0-9\.-]{1,}@[a-z0-9\.-]{1,}\.[a-z]{2,5}$/)) {
			await Logs(null, "The client attempted to register but provided an invalid email in the body of their request", request.clientIP);
			
			return response.status(400).send({
				status: 400,
				response: "Invalid email"
			});
		}
		if (body.password.length > 25 || body.password.length < 10) {
			await Logs(null, "The client attempted to register but provided an invalid password in the body of their request", request.clientIP);
			
			return response.status(400).send({
				status: 400,
				response: "Invalid password length"
			});
		}
		if ((await queryAsync("SELECT username FROM accounts WHERE username = ? OR email = ? LIMIT 1", body.username.toLowerCase(), body.email.toLowerCase())).length > 0) {
			await Logs(null, "The client attempted to register, but the username or the email they provided is already taken", request.clientIP);
			
			return response.status(401).send({
				status: 401,
				response: "This username or this email is already used"
			});
		}
	},
	handler: async (request, response) => {
		try {
			const body = request.body;
			
			const salt = await genSalt();
			
			const hashedPassword = await hash(body.password, salt);
			const version = uuid();

			const email_hash = createHmac("sha256", process.env.LOW_SECRET_KEY!)
				.update(body.email.trim().toLowerCase())
				.digest("hex");
			

			await queryAsync("INSERT INTO accounts (username, email, email_hash, hash, version) VALUES (?, ?, ?, ?, ?)", body.username.toLowerCase(), cipher(body.email.toLowerCase()), email_hash, hashedPassword, version);
			
			const [account]: [{ id: number }] = await queryAsync("SELECT id FROM accounts WHERE username = ? AND email_hash = ? LIMIT 1", body.username.toLowerCase(), email_hash);
			
			await Logs(account.id, "The client created an account", request.clientIP);
			
			if (account.id === 1) { // The first account created is an administrator by default. This allows the user to grant permissions to other accounts.
				await Logs(account.id, "The client created an account", request.clientIP);

				await queryAsync("UPDATE accounts SET permissions = 1 WHERE id = 1 LIMIT 1");
			}

			
			const token = generateToken(account.id, version);

			return response
			.setCookie(
				"token",
				token,
				{
					path: "/",
					maxAge: 2629743,
					secure: process.env.DEBUG === "FALSE",
					httpOnly: true,
					sameSite: process.env.DEBUG === "FALSE" ? "none" : "lax"
				}
			)
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