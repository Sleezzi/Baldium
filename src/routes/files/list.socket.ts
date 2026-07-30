import { stat, readdir } from "fs/promises";
import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import unauthorizeds from "../../components/files/Unauthorized";
import { join } from "path";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("read_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to list files from a folder but does not have permission to", client.ip);
			reply(403, "You don't have the permission to read file");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to list files from a folder but did not provide a path", client.ip);
			reply(400, "Invalid path");
			return;
		}
		for (const unauthorized of unauthorizeds) {
			if (typeof unauthorized === "string") {
				if (unauthorized === args) {
					await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
					reply(404, "File not found");
					return;
				}
			}
			if (args.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
				reply(404, "File not found");
				return ;
			}
		}
		
		const path = join(process.env.SERVER_PATH!, args);
		
		if (!await fsExist(path) || !(await stat(path)).isDirectory()) {
			await Logs(client.userId, `The client attempted to list files in a folder, but it does not exist`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		
		await Logs(client.userId, `The client has listed the files in the ${path} folder`, client.ip);
		
		const files = (await readdir(path, { withFileTypes: true }))
		.filter((file) => file.isDirectory() || file.isFile())
		.filter((file) => {
			for (const unauthorized of unauthorizeds) {
				if (typeof unauthorized === "string") {
					if (unauthorized === `${path}${file.name}`) return false;
				}
				if (`${path}${file.name}`.match(unauthorized)) return false;
			}
			return true;
		})
		.map((file) => ({ path: file.name, type: file.isDirectory() ? "folder" : "file" }));
		
		reply(200, files);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;