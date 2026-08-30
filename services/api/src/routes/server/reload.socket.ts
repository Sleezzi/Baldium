import { Socket } from "@baldium/shared-types/src/Route.js";
import rcon from "../../components/rcon";
import { checkPermission } from "../../components/account";
import Logs from "../../components/logs";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			await Logs(client.userId, "The client attempted to reload the server but lacks sufficient permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		await Logs(client.userId, "The client initiated a server reload.", client.ip);
		
		await rcon.send("reload");
		
		reply(200, "Reloading");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;