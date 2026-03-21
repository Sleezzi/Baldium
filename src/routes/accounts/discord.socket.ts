import { Socket } from "../../types/Route";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";

const route: Socket = async (client, token: string, reply) => {
	try {
		if (!token) {
			await Logs(client.userId, "The client attempted to link their Discord account but did not provide a login token", client.ip);
			reply(400, "Missing token");
			return;
		}
		if (typeof token !== "string") {
			await Logs(client.userId, "The client attempted to link their Discord account but did not provide a login token", client.ip);
			reply(400, "Invalid token");
			return;
		}
		const discord = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `Bearer ${token}`
			}
		}).then((_response) => _response.json());
		
		if (!("id" in discord)) {
			await Logs(client.userId, "The client attempted to link their Discord account but did not provide a valid login token", client.ip);
			reply(403, "Invalid token");
			return;
		}
		const accounts = await queryAsync("SELECT * FROM accounts WHERE discord = ?", discord.id) as [];

		if (accounts.length > 0) {
			await Logs(client.userId, "The client attempted to link their Discord account but provided a token linked to a Discord account already linked to another account", client.ip);
			reply(403, "This account is already linked to an other account");
			return;
		}
		
		await Logs(client.userId, "The client links their account to a Discord account", client.ip);
		await queryAsync("UPDATE accounts SET discord = ? WHERE id = ?", discord.id, client.userId);
		reply(200, "Discord's account linked");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;