import { Socket } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) {
			await Logs(client.userId, "The client attempted to delete a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to delete mods");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid id");
			return;
		}
		const dependents: { name: string }[] = await queryAsync("WITH RECURSIVE affected(id) AS (SELECT ? UNION ALL SELECT d.mod_id FROM mod_dependencies d JOIN affected a ON d.depend_on_id = a.id) SELECT id FROM affected WHERE id != ?", args);
		
		reply(200, dependents.map((mod) => mod.name));
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;