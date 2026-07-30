import { rm } from "fs/promises";
import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import unauthorizeds from "../../components/files/Unauthorized";
import { join } from "path";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to delete a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to delete file");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to delete a file but did not provide a valid path to the file", client.ip);
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
		
		if (await fsExist(path)) {
			rm(path, { recursive: true });
		} else {
			await Logs(client.userId, `The client attempted to delete the file located in ${path} but it's not a file`, client.ip);
			reply(404, "File not found");
			return;
		}
		await Logs(client.userId, `The client deleted the file located in ${path}`, client.ip);
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}


module.exports = route;