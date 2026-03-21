import { Socket } from "../../types/Route";
import checkPermission from "../../components/permissions";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args, reply) => {
	try {
		if (checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		// await docker.restart();
		
		reply(200, "Restarting");
		Trigger("server_status", "restarted");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;