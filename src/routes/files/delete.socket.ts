import { existsSync, lstatSync, rmSync } from "fs";
import { Socket } from "../../types/Route";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const hiddens = [
	// "*.env", // Already filtred
	".rcon-cli.yaml",
	"run.bat",
	"run.sh",
	"eula.txt",
	// "mods/*", // Already filtred
];

const route: Socket = (client, args: string, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			Logs(client.username, "The client attempted to delete a file but does not have the necessary permissions to do so", client.ip);
			reply(403, "You don't have the permission to delete file");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to delete a file but did not provide a valid path to the file", client.ip);
			reply(400, "Invalid path");
			return;
		}

		if (args.includes("./")) {
			Logs(client.username, `The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path "${args}" contained ./ which likely means the user attempted to view/modify files outside the server folder`, client.ip);
			reply(404, "File not found");
			return;
		}
		if (args.endsWith(".env")) {
			Logs(client.username, "The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path contained .env, which likely means the user attempted to view/modify files containing sensitive information", client.ip);
			reply(403, "For the security of the server, the .env's file can't be read from the api");
			return;
		}

		if (hiddens.find((hidden) => `${!hidden.startsWith("/") && "/"}${hidden}` === `${!args.startsWith("/") && "/"}${args}`)) {
			Logs(client.username, "The client attempted to delete a file but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
			reply(404, "File not found");
			return;
		}
		
		const path = `${process.env.SERVER_PATH}${!args.startsWith("/") && "/"}${args}`;
		
		if (!existsSync(path)) {
			Logs(client.username, `The client attempted to delete the file located in ${path} but the file does not exist`, client.ip);
			reply(404, "File not found");
			return;
		}
		if (lstatSync(path).isFile()) {
			rmSync(path);
		} else {
			Logs(client.username, `The client attempted to delete the file located in ${path} but it's not a file`, client.ip);
			reply(404, "File not found");
			return;
		}
		Logs(client.username, `The client deleted the file located in ${path}`, client.ip);
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}


module.exports = route;