import { Socket } from "@baldium/shared-types/src/Route.js";
import { Trigger } from "../../components/subscription";
import { checkPermission } from "../../components/account";
import * as docker from "../../components/docker";
import Logs from "../../components/logs";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			await Logs(client.userId, "The client attempted to stop the server but lacks sufficient permissions.", client.ip);
			await reply(403, "You can't access to this ressource");
			return;
		}
		
		await Logs(client.userId, "The client stopped the server.", client.ip);
		await docker.sendAction("Stop");
		
		await reply(200, "Stoping");
		Trigger("server_status", "stopped");
	} catch (err) {
		console.error(err);
		await reply(502, "Internal error");
	}
}

module.exports = route;