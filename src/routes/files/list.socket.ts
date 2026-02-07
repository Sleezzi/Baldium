import { existsSync, lstatSync, readdirSync } from "fs";
import { Socket } from "../../types/Route";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const hiddens = [
	// "*.env", // Already filtred
	".rcon-cli.yaml",
	"run.bat",
	"run.sh",
	"eula.txt"
];

const route: Socket = (client, args: string, reply) => {
	try {
		if (!checkPermission("read_files", client.permissions)) {
			Logs(client.username, "The client attempted to list files from a folder but does not have permission to", client.ip);
			reply(403, "You don't have the permission to read file");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to list files from a folder but did not provide a path", client.ip);
			reply(400, "Invalid path");
			return;
		}
		if (args.includes("./")) {
			Logs(client.username, `The client attempted to list files from a folder but did not provide a path\n /!\\ The path "${args}" contained ./ which likely means the user attempted to view files outside the server folder`, client.ip);
			reply(404, "File not found");
			return;
		}
		
		const path = `${process.env.SERVER_PATH}${!args.startsWith("/") && "/"}${args}${!args.endsWith("/") && args.length > 0 ? "/" : ""}`;
		
		if (!existsSync(path)) {
			Logs(client.username, `The client attempted to list files in a folder, but it does not exist`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		if (!lstatSync(path).isDirectory()) {
			Logs(client.username, `The client attempted to list files in a folder, but it does not exist`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		
		Logs(client.username, `The client has listed the files in the ${path} folder`, client.ip);
		
		const files = readdirSync(path, { withFileTypes: true })
		.filter((file) => file.isDirectory() || file.isFile())
		.filter((file) => !file.name.endsWith(".env") && !hiddens.find((_path) => `${path}${_path}` === `${path}${file.name}`))
		.map((file) => ({ path: file.name, type: file.isDirectory() ? "folder" : "file" }));
		
		reply(200, files);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;