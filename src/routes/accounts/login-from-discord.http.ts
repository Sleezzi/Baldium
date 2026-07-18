import { HTTP } from "../../../types/Route";
import queryAsync from "../../components/queryAsync";

import Logs from "../../components/logs";
import { generateToken } from "../../components/account";

const route: HTTP<{}, {}> = {
	method: "POST",
	handler: async (request, response) => {
		try {
		// 	const auth = request.headers.authorization;
		// 	if (!auth) {
		// 		await Logs(null, "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
		// 		response.status(400).json({
		// 			status: 400,
		// 			response: "Invalid request"
		// 		});
		// 		return;
		// 	}
		// 	if (typeof auth !== "string") {
		// 		await Logs(null, "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
		// 		response.status(400).json({
		// 			status: 400,
		// 			response: "Invalid request"
		// 		});
		// 		return;
		// 	}
		// 	if (!auth.startsWith("Bearer ")) {
		// 		await Logs(null, "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
		// 		response.status(400).json({
		// 			status: 400,
		// 			response: "Invalid request"
		// 		});
		// 		return;
		// 	}
		// 	const discord = await fetch("https://discord.com/api/users/@me", {
		// 		headers: {
		// 			Authorization: `Bearer ${auth.slice(7)}`
		// 		}
		// 	}).then((_response) => _response.json());
			
		// 	if (!("id" in discord)) {
		// 		await Logs(null, "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
		// 		response.status(403).json({
		// 			status: 403,
		// 			response: "This accounts doesn't not exist"
		// 		});
		// 		return;
		// 	}
		// 	const accounts: { id: number }[] = await queryAsync("SELECT id FROM accounts WHERE discord = ?", discord.id);
			
		// 	if (accounts.length === 0) {
		// 		await Logs(null, "The client attempted to log in with their Discord account, but their Discord account is not linked to any account", request.ip);
		// 		response.status(403).json({
		// 			status: 403,
		// 			response: "This accounts doesn't not exist"
		// 		});
		// 		return;
		// 	}
		// 	const account = accounts[0];
			
		// 	await Logs(account.id, "The client logged in using their Discord account", request.ip);
		// 	const token = generateToken(account.id);
			
		// 	response
		// 	.status(200)
		// 	.setHeader(
		// 		"Set-Cookie",
		// 		process.env.COOKIE!
		// 		.replace("__token", token)
		// 		.replace("__expire", (Date.now() + 2629743).toString())
		// 	).json({
		// 		status: 200,
		// 		response: token
		// 	});
		} catch (err) {
			console.error(err);
			response
			.status(500)
			.type("text/json")
			.send({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;