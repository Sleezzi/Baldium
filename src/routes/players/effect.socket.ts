import { Socket } from "../../types/Route";
import { rcon } from "../../index";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args: {
	username: string,
	effect: string,
	set: "on" | "off",
	duration?: number | "infinite",
	level?: number
}, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but does not have the necessary permissions", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (!("username" in args) || typeof args.username !== "string" || args.username.includes("@")) {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player name");
			return;
		}
		if (args.set !== "on" && args.set !== "off") {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid request");
			return;
		}
		if (!args.effect) {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid request");
			return;
		}
		if (args.set !== "on" && args.set !== "off") {
			await Logs(client.userId, "The client attempted to apply or remove effects on a player but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid request");
			return;
		}
		if (args.effect === "minecraft:night_vision") {
			await rcon.send(`tag ${args.username} ${args.set === "on" ? "add" : "remove"} night_vision`);
		}
		if (args.set === "on") {
			await Logs(client.userId, `The client applied the effect ${args.effect} to "${args.username}" for ${args.duration || 1}s with a strength of ${args.level || 1}`, client.ip);
			await rcon.send(`effect give ${args.username} ${args.effect}${args.duration ? ` ${args.duration}${args.level ? ` ${args.level}` : ""}` : ""}`)
		} else {
			await Logs(client.userId, `The client removed the effect ${args.effect} to "${args.username}"`, client.ip);
			await rcon.send(`effect clear ${args.username} ${args.effect}`)
		}
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;