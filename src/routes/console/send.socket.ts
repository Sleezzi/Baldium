import { Socket } from "../../types/Route";
import { rcon } from "../../index";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (checkPermission("write_console", client.permissions)) {
			Logs(client.username, "The client attempted to execute a command on the server but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			Logs(client.username, "The client attempted to execute a command on the server but did not provide a command to execute", client.ip);
			reply(400, "Invalid command");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to execute a command on the server but did not provide a command to execute", client.ip);
			reply(400, "Invalid command");
			return;
		}

		Logs(client.username, `The client executed the command ${args} on the server`, client.ip);
		await rcon.send(args);
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;