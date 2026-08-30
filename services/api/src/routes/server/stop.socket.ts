import { Socket } from "@baldium/shared-types/src/Route.js";
import { Trigger } from "../../components//subscription";
import { checkPermission } from "../../components//account";
import * as docker from "../../components//docker";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		await docker.sendAction("Stop");
		
		reply(200, "Stoping");
		Trigger("server_status", "stopped");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;