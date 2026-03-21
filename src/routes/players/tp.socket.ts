import { Socket } from "../../types/Route";
import { rcon } from "../../index";
import checkPermission from "../../components/permissions";
import Logs from "../../components/logs";

const route: Socket = async (client, args: { username: string, destination: string }, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to teleport a player but does not have the necessary permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to teleport a player but did not provide the arguments requested by the server.", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (!("username" in args) || typeof args.username !== "string" || args.username.includes("@")) {
			await Logs(client.userId, "The client attempted to teleport a player but did not provide a username.", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (!("destination" in args) || typeof args.destination !== "string") {
			await Logs(client.userId, "The client attempted to teleport a player but did not provide a destination coordinate.", client.ip);
			reply(400, "Invalid coordonate");
			return;
		}

		await Logs(client.userId, `The client teleported the player "${args.username}" to "${args.destination}"`, client.ip);
		
		await rcon.send(`tp ${args.username} ${args.destination}`);
		
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;