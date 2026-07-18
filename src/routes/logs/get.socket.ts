import { stat, readFile } from "fs/promises";
import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import { decipher } from "../../components/crypt";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("log", client.permissions)) {
			await Logs(client.userId, "The client attempted to read a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to read file");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to read a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}
		if (args.includes("./")) {
			await Logs(client.userId, `The client attempted to read a file but did not provide a valid path to the file\n /!\\ The path "${args}" contained ./ which likely means the user attempted to read files outside the server folder`, client.ip);
			reply(404, "File not found");
			return;
		}
		if (!args.endsWith(".log")) {
			await Logs(client.userId, "The client attempted to read a log file, but the file did not end with \".log\".", client.ip);
			reply(403, "You can only access the file ending with \".log\"");
			return;
		}

		const path = `${process.env.LOGS_PATH}${args.startsWith("/") ? "" : "/"}${args}`;
		
		if (!await fsExist(path) || !(await stat(path)).isFile()) {
			await Logs(client.userId, `The file that the client tried to read is not a file`, client.ip);
			reply(404, "File not found");
			return;
		}
		await Logs(client.userId, `The client readed the file in ${path}`, client.ip);
		const content = (await readFile(path)).toString("utf8");

		const result: string[] = [];

		for (const line of content.split("\n")) {
			if (line.length === 0) continue;
			result.push(decipher(line));
		}

		reply(200, Buffer.from(result.join("\n")).toString("base64"));
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;