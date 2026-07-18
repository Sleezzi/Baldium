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
	userId: number
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
			
		const hashs: { id: number, username: string, email: string, hash: string }[] = await queryAsync("SELECT id, username, email, hash FROM accounts WHERE username = ? OR email = ?", body.id.toLowerCase(), body.id.toLowerCase()) as any;
		if (hashs.length === 0) {
			await Logs(null, "The client attempted to log in, but their account was not found in the database", request.ip);
			return response.status(401).send({
				status: 401,
				response: "This accounts doesn't not exist"
			});
		}
		
		const isValid = await compare(body.password, hashs[0].hash);
		if (!isValid) {
			await Logs(hashs[0].id, "The client attempted to log in, but the password they provided is not the same as the one in the database", request.ip);
			return response.status(403).send({
				status: 403,
				response: "Invalid password"
			});
		}
		(request as any).userId = hashs[0].id;
	},
	handler: async (request, response) => {
		try {
			const token = generateToken(request.userId);
			await Logs(request.userId, "The client logged in and was provided with a token", request.ip);
			
			response
			.status(200)
			.setCookie(
				"token",
				token,
				{
					maxAge: Date.now() + 2629743,
					secure: true,
					domain: ".sleezzi.fr",
					sameSite: "none"
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