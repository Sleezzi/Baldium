import { createWriteStream } from "fs";
import { stat } from "fs/promises";
import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import unauthorizeds from "../../components/files/Unauthorized";
import { join } from "path";

const route: Socket = async (client, args: { path: string, value: string }, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to edit a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to read file");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (!("path" in args) || typeof args.path !== "string") {
			await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}
		if (!("value" in args) || typeof args.value !== "string") {
			await Logs(client.userId, "The client attempted to edit a file but did not provide a valid value for the file", client.ip);
			reply(400, "Invalid path");
			return;
		}
		for (const unauthorized of unauthorizeds) {
			if (typeof unauthorized === "string") {
				if (unauthorized === args.path) {
					await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
					reply(404, "File not found");
					return;
				}
			}
			if (args.path.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
				reply(404, "File not found");
				return ;
			}
		}

		const path = join(process.env.SERVER_PATH!, args.path);

		if (!await fsExist(path) || !(await stat(path)).isFile()) {
			await Logs(client.userId, `The target that the client tried to edit is not a file`, client.ip);
			reply(404, "File not found");
			return;
		}
		await Logs(client.userId, `The client edited the file in ${path}`, client.ip);
		const writeStream = createWriteStream(path);
		writeStream.write(atob(args.value));
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;