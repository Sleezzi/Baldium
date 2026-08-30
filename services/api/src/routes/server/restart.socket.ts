import { Socket } from "@baldium/shared-types/src/Route.js";
import { checkPermission } from "../../components//account";
import { Trigger } from "../../components//subscription";
import * as docker from "../../components//docker";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		await docker.sendAction("Restart");
		
		reply(200, "Restarting");
		Trigger("server_status", "restarted");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;