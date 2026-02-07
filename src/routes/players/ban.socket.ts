import { rcon } from "../../index";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";
import { Socket } from "../../types/Route";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			Logs(client.username, "The client attempted to ban a player but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			Logs(client.username, "The client attempted to ban a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to ban a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}

		Logs(client.username, `The client banned the player "${args}"`, client.ip);
		await rcon.send(`ban ${args} Banned from the pannel`);
		
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;