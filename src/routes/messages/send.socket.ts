import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: { id: string, message: string }, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) { // Checks if the user has permission to add mods
			await Logs(client.userId, "The client attempted to add a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to send messages to users");
			return;
		}
		if (!args) { // Checks if the query is correctly formed
			await Logs(client.userId, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args.id !== "string" || typeof args.message !== "string") { // Checks if the query is correctly formed
			await Logs(client.userId, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}

		Trigger("client", {
			userId: args.id,
			reason: "message",
			args: {
				origin: client.userId,
				message: args.message
			}
		});

		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;