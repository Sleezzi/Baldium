import { join } from "path";
import { Socket } from "../../types/Route";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import queryAsync from "../../components/queryAsync";
import depolluteVersion from "../../components/depolluteVersion";
import Download from "../../components/download";
import Logs from "../../components/logs";
import getMod from "../../components/downloadMod";
import checkPermission from "../../components/permissions";


const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) { // Checks if the user has permission to add mods
			Logs(client.username, "The client attempted to add a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to delete mods");
			return;
		}
		if (!args) { // Checks if the query is correctly formed
			Logs(client.username, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args !== "string") { // Checks if the query is correctly formed
			Logs(client.username, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid id");
			return;
		}
		
		getMod(client, args, reply);
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;