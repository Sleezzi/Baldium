import { Socket } from "@baldium/shared-types/src/Route.js";
import rcon from "../../components//rcon";
import { checkPermission } from "../../components//account";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		await rcon.send("reload");
		
		reply(200, "Reloading");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;