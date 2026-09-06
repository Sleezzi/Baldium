import rcon from "../../components/rcon";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { Socket } from "@baldium/shared-types/src/Route.js";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to ban a player but does not have permission to", client.ip);
			await reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to ban a player but did not provide the data requested by the server", client.ip);
			await reply(400, "Invalid player name");
			return;
		}
		if (typeof args !== "string" || args.includes("@")) {
			await Logs(client.userId, "The client attempted to ban a player but did not provide the data requested by the server", client.ip);
			await reply(400, "Invalid player name");
			return;
		}

		await Logs(client.userId, `The client banned the player "${args}"`, client.ip);
		await rcon.send(`ban ${args} Banned from the dashboard`);
		
		await reply(200, "Success");
	} catch (err) {
		console.error(err);
		await reply(502, "Internal error");
	}
}

module.exports = route;