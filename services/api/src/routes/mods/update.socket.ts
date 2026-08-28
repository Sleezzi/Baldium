import { Socket } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components//queryAsync";
import Logs from "../../components//logs";
import { checkPermission } from "../../components//account";
import getMod from "../../components//mods/downloadMod";
import { rm } from "fs/promises";
import Mod from "../../components//mods/mods";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) {
			await Logs(client.userId, "The client attempted to update a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to update mods");
			return;
		}
		if (!args || typeof args !== "string") {
			await Logs(client.userId, "The client attempted to update a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		const mods: { id: string, name: string }[] = await queryAsync("SELECT id FROM mods WHERE id = ? AND version = \"manually-managed\" LIMIT 1", args) as any;
		if (mods.length === 0) {
			await Logs(client.userId, `The client attempted to update the mod ${args} but it does not exist in the server's mod list`, client.ip);
			reply(404, "Mod not found");
			return;
		}
		await rm(`${process.env.SERVER_PATH}/mods/${args}`, { recursive: true });

		const mod = new Mod(args);
		await mod.init();
		if (!mod.latest) {
			return;
		}
		await rm(`${process.env.SERVER_PATH}/mods/${args}`, { recursive: true });
		await mod.download(mod.latest, (file) => reply(102, `Downloading files for the mod ${mod.id} (${file}/${mod.latest!.files.length})`));

		await Logs(client.userId, `The client updated the mod ${args}`, client.ip);
		reply(200, "The server has updated its mod list");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;
