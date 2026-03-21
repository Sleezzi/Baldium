import { createWriteStream } from "fs";
import { stat } from "fs/promises";
import { Socket } from "../../types/Route";
import { join } from "path";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";
import fsExist from "../../components/fsExist";

const hiddens = [
	// "*.env", // Already filtred
	".rcon-cli.yaml",
	"run.bat",
	"run.sh",
	"eula.txt",
	// "mods/*", // Already filtred
];

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
		if (args.path.includes("./")) {
			await Logs(client.userId, `The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path "${args}" contained ./ which likely means the user attempted to edit files outside the server folder`, client.ip);
			reply(404, "File not found");
			return;
		}
		if (args.path.endsWith(".env")) {
			await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path contained .env, which likely means the user attempted to modify files containing sensitive information", client.ip);
			reply(403, "For the security of the server, the .env's file can't be read from the api");
			return;
		}
		if (args.path.startsWith("mods/") || args.path.startsWith("/mods/")) {
			await Logs(client.userId, "The client attempted to edit a file but the file is in the mods's folder", client.ip);
			reply(403, "You can't edit the mods");
			return;
		}
		if (hiddens.find((hidden) => `${!hidden.startsWith("/") && "/"}${hidden}` === `${!args.path.startsWith("/") && "/"}${args.path}`)) {
			await Logs(client.userId, "The client attempted to edit a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
			reply(404, "File not found");
			return;
		}

		const path = `${process.env.SERVER_PATH}${!args.path.startsWith("/") && "/"}${args.path}`;

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