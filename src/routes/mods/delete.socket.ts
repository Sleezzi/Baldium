import { Socket } from "../../types/Route";
import { existsSync, rmSync } from "fs";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";


const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) {
			Logs(client.username, "The client attempted to delete a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to delete mods");
			return;
		}
		if (!args) {
			Logs(client.username, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid id");
			return;
		}

		const deleteMod = async (id: string) => {
			const mods: { id: string, name: string, dependencies: string }[] = await queryAsync("SELECT * FROM mods WHERE id = ?", args) as any;
			if (mods.length === 0) {
				Logs(client.username, `The client attempted to remove the mod ${args} but it does not exist in the server's mod list`, client.ip);
				reply(404, "Mod not found");
				return;
			}
			const mod = mods[0];

			if (!existsSync(`${process.env.SERVER_PATH}/mods/${mod.name}`)) {
				reply(102, "The mod was present in the mods list but not in the mods folder; this usually happens when a mod is manually deleted");
			} else {
				reply(102, "The server is deleting the mod file from the mods folder");
				rmSync(`${process.env.SERVER_PATH}/mods/${mod.name}`);
				reply(102, "The server deleted the mod file from the mods folder. Now the server is removing the mod from the mods list");
			}
			
			await queryAsync("DELETE FROM mods WHERE id = ?", mod.id);
			Logs(client.username, `The client removed the mod ${mod.name}`, client.ip);
			if (mod.dependencies) {
				for (const dependency of JSON.parse(mod.dependencies)) {
					deleteMod(dependency);
				}
			}
		}

		deleteMod(args);
		reply(200, "The server removed the mod from the mod list");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;