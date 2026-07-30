import { HTTP } from "../../../types/Route";
import queryAsync from "../../components/queryAsync";

import { compare } from "bcrypt";
import Logs from "../../components/logs";
import { generateToken } from "../../components/account";


const route: HTTP<{
	Body: {
		id: string,
		password: string,
	}
}, {
	user: {
		id: number,
		version: string
	}
}> = {
	method: "POST",
	schema: {
		body: {
			type: "object",
			properties: {
				id: {
					type: "string"
				},
				password: {
					type: "string"
				}
			},
			required: ["id", "password"]
		}
	},
	prehandler: async (request, response, done) => {
		const body = request.body;
			
		const accounts: { id: number, username: string, email: string, hash: string, version: string }[] = await queryAsync("SELECT id, username, email, hash, version FROM accounts WHERE username = ? OR email = ?", body.id.toLowerCase(), body.id.toLowerCase()) as any;
		if (accounts.length === 0) {
			await Logs(null, "The client attempted to log in, but their account was not found in the database", request.clientIP);
			return response
			.status(401)
			.setCookie(
				"token",
				"",
				{
					maxAge: 0
				}
			)
			.send({
				status: 401,
				response: "This accounts doesn't not exist"
			});
		}
		
		const isValid = await compare(body.password, accounts[0].hash);
		if (!isValid) {
			await Logs(accounts[0].id, "The client attempted to log in, but the password they provided is not the same as the one in the database", request.clientIP);
			return response
			.setCookie(
				"token",
				"",
				{
					maxAge: 0
				}
			)
			.status(403)
			.send({
				status: 403,
				response: "Invalid password"
			});
		}
		(request as any).user = {
			id: accounts[0].id,
			version: accounts[0].version
		}
	},
	handler: async (request, response) => {
		try {
			const token = generateToken(request.user.id, request.user.version);
			await Logs(request.user.id, "The client logged in and was provided with a token", request.clientIP);
			
			response
			.status(200)
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
			.send({
				status: 200,
				response: token
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