import { Socket } from "@baldium/shared-types/src/Route.js";
import rcon from "../../components/con";
import Logs from "../../components/ogs";
import { checkPermission } from "../../components/ccount";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to clear a player's inventory but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to clear a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (typeof args !== "string" || args.includes("@")) {
			await Logs(client.userId, "The client attempted to clear a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}

		await Logs(client.userId, `The client deleted the inventory of "${args}"`, client.ip);
		await rcon.send(`clear ${args}`);
		await rcon.send(`msg ${args} Your inventory has been cleared by an admin from the dashboard.`);
		
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;