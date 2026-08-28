import { readdir } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import Logs from "../../../components/logs";
import { checkPermission } from "../../../components/account";
import { join } from "path";

const route: Socket = async (client, args: number, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to read a log's file but does not have the necessary permissions", client.ip);
			reply(403, "You don't have the permission to read log's file");
			return;
		}
		if (typeof args !== "number") {
			await Logs(client.userId, "The client attempted to read a log's file but did not provide a valid user id", client.ip);
			reply(400, "Invalid user id");
			return;
		}
		const files = (await readdir(join(process.env.LOGS_PATH!, args.toString()), { withFileTypes: true, recursive: false }))
		.filter((file) => file.isFile())
		.filter((file) => file.name.endsWith(".log"))
		.map((file) => file.name)
		.sort((a, b) => a.localeCompare(b));

		reply(200, files);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;