import { Socket } from "@baldium/shared-types/src/Route.js";
import rcon from "../../components/rcon";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("write_console", client.permissions)) {
			await Logs(client.userId, "The client attempted to execute a command on the server but does not have permission to", client.ip);
			await reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to execute a command on the server but did not provide a command to execute", client.ip);
			await reply(400, "Invalid command");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to execute a command on the server but did not provide a command to execute", client.ip);
			await reply(400, "Invalid command");
			return;
		}

		await Logs(client.userId, `The client executed the command ${args} on the server`, client.ip);
		Trigger("console", `[DASHBOARD] The user with the id "${client.userId}" used the command "/${args}"`);
		const response = await rcon.send(args);
		Trigger("console", response);
		await reply(200, "Success");
	} catch (err) {
		console.error(err);
		await reply(502, "Internal error");
	}
}

module.exports = route;