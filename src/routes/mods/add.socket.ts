import { Socket } from "../../../types/Route";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import Mod from "../../components/mods/mods";
import { Trigger } from "../../components/subscription";

const downloadMod = async (mod: Mod) => {
	const exist = await queryAsync("SELECT * FROM mods WHERE id = ?", mod.id);

	if (exist.length > 0) {
		return;
	}

	await mod.init();
	if (!mod.latest) {
		return;
	}
	
	Trigger("mods", {
		message: "new",
		mod: mod.id,
		args: {
			name: mod.latest!.name,
			version: mod.latest!.version_number
		}
	});
	// await mod.download(mod.latest, (file) => Trigger("mods", {
	// 	message: "download",
	// 	mod: mod.id,
	// 	args: {
	// 		current: file,
	// 		goal: mod.latest!.files.length
	// 	}
	// }));

	await queryAsync(
		"INSERT INTO mods (id, version) VALUES (?, ?)",
		mod.id,
		mod.latest.version_number
	);

	for (const dependance of mod.dependancies(mod.latest)) {
		await queryAsync("INSERT INTO mod_dependencies (mod_id, depend_on_id) VALUES (?, ?)", mod.id, dependance.id);
		await downloadMod(dependance);
	}
}


const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) { // Checks if the user has permission to add mods
			await Logs(client.userId, "The client attempted to add a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to delete mods");
			return;
		}
		if (!args) { // Checks if the query is correctly formed
			await Logs(client.userId, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args !== "string") { // Checks if the query is correctly formed
			await Logs(client.userId, "The client attempted to add a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid id");
			return;
		}

		const mod = new Mod(args);
		downloadMod(mod);
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;