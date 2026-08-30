import { Socket } from "@baldium/shared-types/src/Route.js";
import { checkPermission } from "../../components/account";
import { Trigger } from "../../components/subscription";
import * as docker from "../../components/docker";
import Logs from "../../components/logs";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			await Logs(client.userId, "The client attempted to start the server but lacks sufficient permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		await Logs(client.userId, "The client initiated a server startup.", client.ip);
		await docker.sendAction("Start");
		
		reply(200, "Starting");
		Trigger("server_status", "started");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;