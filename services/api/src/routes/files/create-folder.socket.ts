import { mkdir } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import { blocklist, isNotTraversal } from "../../components/files/Unauthorized";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to create a folder but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to create folders");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to create a folder but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}

		const path = isNotTraversal(process.env.SERVER_PATH!, args);
		
		if (!path) {
			await Logs(client.userId, "The client attempted to create a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
			reply(403, "Creation not allowed");
			return;
		}

		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(client.userId, "The client attempted to create a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
					reply(403, "Creation not allowed");
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to create a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
				reply(403, "Creation not allowed");
				return;
			}
		}
		if (await fsExist(path)) {
			await Logs(client.userId, `The client attempted to create the folder located in ${path} but it already exist`, client.ip);
			reply(403, "Creation not allowed");
			return;
		}
		
		await mkdir(path, { recursive: false });

		await Logs(client.userId, `The client created the folder located in ${path}`, client.ip);

		Trigger("files", {
			action: "folder-created",
			path: args
		});

		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}


module.exports = route;