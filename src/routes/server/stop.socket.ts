import Route, { Socket } from "../../types/Route";
import { Trigger } from "../../components/subscription";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args, reply) => {
	try {
		if (checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		// await docker.stop();
		
		reply(200, "Stopped");
		Trigger("server_status", "stopped");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;