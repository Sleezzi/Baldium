import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { Trigger } from "../../components/subscription";
import * as docker from "../../components/docker";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to restart the api's container but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}

		await Logs(client.userId, `The client restart the api's container`, client.ip);
		Trigger("console", `[DASHBOARD] The user with the id "${client.userId}" restarted the api`);
		reply(200, "Success");
		await docker.sendAction("RestartMe");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;