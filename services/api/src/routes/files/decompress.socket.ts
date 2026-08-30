import { mkdir, stat } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import { blocklist, isNotTraversal } from "../../components/files/Unauthorized";
import { join } from "path";
import { v4 as uuid } from "uuid";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to decompress a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to decompress files");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to decompress a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}

		const path = isNotTraversal(process.env.SERVER_PATH!, args);
		if (!path) {
			await Logs(client.userId, "The client attempted to decompress a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
			reply(404, "File not found");
			return;
		}
		
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(client.userId, "The client attempted to decompress a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
					reply(404, "File not found");
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to decompress a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
				reply(404, "File not found");
				return;
			}
		}
		
		if (!(await fsExist(path))) {
			await Logs(client.userId, `The client attempted to decompress the file located in ${path} but it's doesn't exist`, client.ip);
			reply(404, "File not found");
			return;
		}
		const stats = await stat(path);

		if (!stats.isFile()) {
			await Logs(client.userId, `The client attempted to decompress the file located in ${path} but it's not a file`, client.ip);
			reply(404, "File not found");
			return;
		}
		const parent = path.split("/").slice(0, -1).join("/");
		// The zip file will be extracted into a specially created folder.
		let folder_name = path.split("/").pop()!.split(".").slice(0, -1).join("."); // The folder is given the same name as the file, but without the extension.
		

		if (await fsExist(join(parent, folder_name))) { // We verify that the folder does not already exist.
			folder_name = uuid(); // If it already exists, the folder is given a random name.
		}
		await mkdir(join(parent, folder_name), { recursive: false }); // We create the folder.

		// Décompression

		await Logs(client.userId, `The client decompressed the file located in ${path}`, client.ip);
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}


module.exports = route;