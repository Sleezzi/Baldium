import { stat, readdir } from "fs/promises";
import { Socket } from "../../../types/Route";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";
import queryAsync from "../../components/queryAsync";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("log", client.permissions)) {
			await Logs(client.userId, "The client attempted to list files from a folder but does not have permission to", client.ip);
			reply(403, "You don't have the permission to read file");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to list files from a folder but did not provide a path", client.ip);
			reply(400, "Invalid path");
			return;
		}
		if (args.includes("./")) {
			await Logs(client.userId, `The client attempted to list files from a folder but did not provide a path\n /!\\ The path "${args}" contained ./ which likely means the user attempted to view files outside the server folder`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		
		const path = `${process.env.LOGS_PATH}${args.startsWith("/") ? "" : "/"}${args}${!args.endsWith("/") && args.length > 0 ? "/" : ""}`;
		
		if (!await fsExist(path) || !(await stat(path)).isDirectory()) {
			await Logs(client.userId, `The client attempted to list files in a folder, but it does not exist (${path})`, client.ip);
			reply(404, "Folder not found");
			return;
		}
		
		await Logs(client.userId, `The client has listed the files in the ${path} folder`, client.ip);

		const usernames: { username: string, id: number }[] = await queryAsync("SELECT username, id FROM accounts");
		
		const files = (await readdir(path, { withFileTypes: true }))
		.filter((file) => file.isDirectory() || file.isFile())
		.filter((file) => !file.name.endsWith(".env"))
		.map((file): { path: string, type: "file" | "folder" } => ({ path: file.name, type: file.isDirectory() ? "folder" : "file" }))
		.map((file) => {
			if (file.type === "folder" && args === "") {
				if (file.path === "Unknown") return {
					type: "folder",
					path: file.path,
					description: "This file contains all logs not related to the account."
				}
				if (file.path.match(/^[0-9]*$/)) {
					const user = usernames.find((user) => user.id === Number(file.path));
					if (user) {
						return {
							type: "folder",
							path: file.path,
							description: user.username
						}
					}
				}
			}
			return file;
		});
		
		reply(200, files);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;