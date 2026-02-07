import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { genSalt, hash } from "bcrypt";
import Logs from "../../components/logs";

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
				Logs("rejection", "The client attempted to register but did not provide a body in their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.username || typeof body.username !== "string") {
				Logs("rejection", "The client attempted to register but did not provide a username in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.username.match(/[a-zA-Z0-9\-_]{5,25}/)) {
				Logs("rejection", "The client attempted to register but provided an invalid username in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid username length"
				});
				return;
			}
			if (!body.email || typeof body.email !== "string") {
				Logs("rejection", "The client attempted to register but did not provide an email in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.email.match(/[a-z0-9\.-]{1,}@[a-z0-9\.-]{1,}\.[a-z]{2,5}/)) {
				Logs("rejection", "The client attempted to register but provided an invalid email in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid username"
				});
				return;
			}
			if (!body.password || typeof body.password !== "string") {
				Logs("rejection", "The client attempted to register but did not provide a password in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (body.password.length > 25 || body.password.length < 10) {
				Logs("rejection", "The client attempted to register but provided an invalid password in the body of their request", request.ip || "Unknow");
				response.status(400).json({
					status: 400,
					response: "Invalid password length"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				response.status(500).json({
					status: 500,
					response: "Internal error"
				});
				return;
			}
			const usernames: {username: string}[] = await queryAsync("SELECT username FROM accounts WHERE username = ? OR email = ?", body.username.toLowerCase(), body.email.toLowerCase());
			if (usernames.length > 0) {
				Logs("rejection", "The client attempted to register, but the name they provided is already taken", request.ip || "Unknow");
				response.status(401).json({
					status: 401,
					response: "This username is already used"
				});
				return;
			}
			const salt = await genSalt();
			
			const hashedPassword = await hash(body.password, salt);
			
			await queryAsync("INSERT INTO accounts (username, email, hash) VALUES (?, ?, ?)", body.username, body.email.toLowerCase(), hashedPassword);
			
			Logs(body.username, "The client created an account", request.ip || "Unknow");
			
			response.json({
				status: 200,
				response: "Account created"
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