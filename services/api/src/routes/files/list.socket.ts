import { stat, readdir, } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import Logs from "../../components//logs";
import { checkPermission } from "../../components//account";
import fsExist from "../../components//files/fsExist";
import { blocklist, isNotTraversal } from "../../components//files/Unauthorized";
import { join } from "path";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("read_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to list files from a folder but does not have permission to", client.ip);
			reply(403, "You don't have the permission to read folder's content");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to list files from a folder but did not provide a path", client.ip);
			reply(400, "Invalid path");
			return;
		}
		const path = isNotTraversal(process.env.SERVER_PATH!, args);
		if (!path) {
			await Logs(client.userId, "The client attempted to list a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
			reply(404, "File not found");
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === path) {
					await Logs(client.userId, "The client attempted to list a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
					reply(404, "File not found");
					return;
				}
			}
			if (path.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to list a folder but did not provide a valid path to the folder\n /!\\ The path was actually a hidden path", client.ip);
				reply(404, "File not found");
				return;
			}
		}
		
		if (!await fsExist(path) || !(await stat(path)).isDirectory()) {
			await Logs(client.userId, `The client attempted to list files in a folder, but it does not exist`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		
		await Logs(client.userId, `The client has listed the files in the ${path} folder`, client.ip);
		
		const allFiles = await readdir(path, { withFileTypes: true });

		const files = await Promise.all(allFiles
		.filter((file) => file.isDirectory() || file.isFile())
		.filter((file) => {
			for (const unauthorized of blocklist) {
				if (typeof unauthorized === "string") {
					if (unauthorized === join(path, file.name)) return false;
				}
				if (join(path, file.name).match(unauthorized)) return false;
			}
			return true;
		})
		.map(async (file) => {
			const isFolder = file.isDirectory();
			const result: any = {
				path: join(path.slice(process.env.SERVER_PATH!.length), file.name),
				type: isFolder ? "folder" : "file"
			};
			if (!isFolder) {
				const stats = await stat(join(path, file.name));
				result.size = stats.size;
				result.updated = stats.mtime.toISOString();
			}
			return result;
		}));
		
		reply(200, files);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;