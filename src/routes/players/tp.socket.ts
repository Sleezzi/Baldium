import { Socket } from "../../types/Route";
import { rcon } from "../../index";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args: { username: string, destination: string }, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			reply(400, "Invalid player name");
			return;
		}
		if (typeof args !== "string") {
			reply(400, "Invalid player name");
			return;
		}

		await rcon.send(`tp ${args}`);
		
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;