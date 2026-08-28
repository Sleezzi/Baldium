import { rm, stat } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import { blocklist, isTransversal } from "../../components/files/Unauthorized";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to delete a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to delete files");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to delete a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}

		const path = isTransversal(process.env.SERVER_PATH!, args);
		if (!path) {
			await Logs(client.userId, "The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
			reply(404, "File not found");
			return;
		}
		

		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(client.userId, "The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
					reply(404, "File not found");
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
				reply(404, "File not found");
				return;
			}
		}
		
		if (!(await fsExist(path))) {
			await Logs(client.userId, `The client attempted to delete the file located in ${path} but it's doesn't exist`, client.ip);
			reply(404, "File not found");
			return;
		}
		const stats = await stat(path);

		if (!stats.isFile() && !stats.isDirectory()) {
			await Logs(client.userId, `The client attempted to delete the file located in ${path} but it's not a file or a folder`, client.ip);
			reply(404, "File not found");
			return;
		}
		
		await rm(path, { recursive: true });

		await Logs(client.userId, `The client deleted the file located in ${path}`, client.ip);


		Trigger("files", {
			action: "deleted",
			path: args
		});

		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}


module.exports = route;