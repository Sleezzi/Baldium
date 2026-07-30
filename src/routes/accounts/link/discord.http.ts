import { HTTP } from "../../../../types/Route";
import queryAsync from "../../../components/queryAsync";
import Logs from "../../../components/logs";
import { cipher } from "../../../components/crypt";
import { Trigger } from "../../../components/subscription";
import { authenticate } from "../../../components/account";

interface DiscordTokenSet {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

const route: HTTP<{
	Querystring: {
		code: string
	}
}, {
	userId: number
}> = {
	method: "GET",
	schema: {
		querystring: {
			type: "object",
			properties: {
				code: {
					type: "string"
				}
			},
			required: ["code"]
		}
	},
	prehandler: async (request, response) => {
		const cookies = request.cookies;

		if (!cookies.token) {
			return response
				.status(401)
				.type("text")
				.send("You must be authenticated to access this resource");
		}
		const tokenIsValid = await authenticate(cookies.token);
		if (!tokenIsValid.success) {
			return response
				.status(403)
				.type("text")
				.send("Unable to authenticate, delete cookies and log in again.");
		}
		(request as any).userId = tokenIsValid.message;
	},
	handler: async (request, response) => {
		try {
			const adress = request.url;
			console.log(adress, `${process.env.DEBUG === "TRUE" ? request.protocol : "https"}://${request.host}`);
			// const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			// 	method: "POST",
			// 	headers: {
			// 		"Content-Type": "application/x-www-form-urlencoded"
			// 	},
			// 	body: new URLSearchParams({
			// 		client_id: process.env.DISCORD_CLIENT_ID!,
			// 		client_secret: process.env.DISCORD_CLIENT_SECRET!,
			// 		grant_type: "authorization_code",
			// 		code: code,
			// 		redirect_uri: `${process.env.DEBUG === 1 ? request.get("protocole") : "https"}://${request.get("host")}${request.path.split("?")[0]}`,
			// 	})
			// });

			// if (!tokenResponse.ok) {
			// 	await Logs(userId, "The client attempted to link their Discord account but did not provide a valid code", request.clientIP);
			// 	console.log(await tokenResponse.json(), `https://${request.get("host")}${request.path.split("?")[0]}`);
			// 	
			// 	return response
				// 	.status(403)
				// 	.type("text")
				// 	.send("The code provided in the URL is invalid");
			// }

			// const tokens: DiscordTokenSet = await tokenResponse.json();

			// const discord = await fetch("https://discord.com/api/users/@me", {
			// 	headers: {
			// 		Authorization: `Bearer ${tokens.access_token}`
			// 	}
			// })
			// .then((_response) => _response.json());
			
			// if (!("id" in discord)) {
			// 	await Logs(userId, "The client attempted to link their Discord account but did not provide a valid code", request.clientIP);
			// 	
			// 	return response
				// 	.status(404)
				// 	.type("text")
				// 	.send("Unable to load Discord profile");
			// }
			// const accounts: { id: number }[] = await queryAsync("SELECT id FROM accounts WHERE discord = ? AND id != ?", discord.id, userId);

			// if (accounts.length > 0) {
			// 	await Logs(userId, "The client attempted to link their Discord account but provided a token linked to a Discord account already linked to another account", request.clientIP);
			// 	
			// 	return response
				// 	.status(403)
				// 	.type("text")
				// 	.send("This Discord account is already linked to another account.");
			// }
			
			// await Logs(userId, "The client links their account to a Discord account", request.clientIP);
			
			// await queryAsync("UPDATE accounts SET discord = ? WHERE id = ?", discord.id, userId);
			// await queryAsync("UPDATE discord SET access_token = ?, refresh_token = ? WHERE id = ?", cipher(tokens.access_token), cipher(tokens.refresh_token), discord.id);
			
			// Trigger("client", {
			// 	userId: userId,
			// 	reason: "discord",
			// 	args: tokens.access_token
			// });

			response
			.status(200)
			.type("text/html")
			.send(`
				<body>
					<p>Discord account linked successfully. You can now close this window now.</p>
					<script>window.close();</script>
				</body>
			`);
		} catch (err) {
			console.error(err);
			response
			.status(500)
			.type("text")
			.send("An unknown error has occurred. Please try again later.");
		}
	}
}

module.exports = route;