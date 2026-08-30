import { Socket } from "@baldium/shared-types/src/Route.js";
import { rm } from "fs/promises";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import fsExist from "../../components/files/fsExist";

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) {
			await Logs(client.userId, "The client attempted to delete a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to delete mods");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to delete a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid id");
			return;
		}

		// const mods: { id: string }[] = await queryAsync("WITH RECURSIVE affected(id) AS (SELECT id UNION ALL SELECT d.mod_id FROM mod_dependencies d JOIN affected a ON d.depend_on_id = a.id) SELECT id FROM affected WHERE id != ?", args);

		// mods.unshift({ id: args });

		// for (const mod of mods) {
		// 	if (!await fsExist(`${process.env.SERVER_PATH}/mods/${mod.id}`)) {
		// 		reply(102, `The mod ${mod.id} was present in the mods list but not in the mods folder; this usually happens when a mod is manually deleted`);
		// 	}
		// 	reply(102, `Deleting the ${mod.id}'s files`);
		// 	await rm(`${process.env.SERVER_PATH}/mods/${mod.id}`);
		// 	reply(102, `Deleting the mod ${mod.id} from the list`);
		// 	await queryAsync("DELETE FROM mods WHERE id = ?", mod.id, mod.id);
		// }

		reply(200, "Done");

		// const deleteMod = async (id: string) => {
		// 	const mod = mods.find((mod) => mod.id === id);
		// 	if (!mod) {
		// 		await Logs(client.userId, `The client attempted to remove the mod ${args} but it does not exist in the server's mod list`, client.ip);
		// 		reply(404, "Mod not found");
		// 		return;
		// 	}
		// 	if (!await fsExist(`${process.env.SERVER_PATH}/mods/${mod.id}`)) {
		// 		reply(102, "The mod was present in the mods list but not in the mods folder; this usually happens when a mod is manually deleted");
		// 	}
		// 	await new Promise<void>((resolve, error) => { // Removes all mod dependencies
		// 		try {
		// 			const dependecies: string[] = JSON.parse(mod.dependencies);
		// 			let deletedDependecies = 0;
		// 			for (const dependence of dependecies) {
		// 				deleteMod(dependence).then(() => deletedDependecies++).catch((err) => error(err));;
		// 				if (deletedDependecies === dependecies.length) {
		// 					resolve();
		// 				}
		// 			}	
		// 		} catch (err) {
		// 			error(err);
		// 		}
		// 	});

		// 	// Looking for mods that depend on the mod to be removed
		// 	await new Promise<void>((resolve, error) => {
		// 		try {
		// 			let modsDeleted = 0;
		// 			const listOfModsThatNeedTheCurrentMod = mods
		// 			.map((_mod) => ({ id: _mod.id, dependecies: JSON.parse(mod.dependencies) as string[] }))
		// 			.filter((_mod) => _mod.id !== id && _mod.dependecies.includes(id));
				
		// 		for (const _mod of listOfModsThatNeedTheCurrentMod) {
		// 			deleteMod(_mod.id).then(() => modsDeleted++).catch((err) => error(err));
		// 			if (modsDeleted === listOfModsThatNeedTheCurrentMod.length) {
		// 				resolve();
		// 			}
		// 		}
		// 		} catch (err) {
		// 			error(err);
		// 		}
		// 	});

		// 	reply(102, "The server is deleting the mod file from the mods folder");
		// 	await rm(`${process.env.SERVER_PATH}/mods/${mod.name}`);
		// 	reply(102, "The server deleted the mod file from the mods folder. Now the server is removing the mod from the mods list");
			
		// 	await queryAsync("DELETE FROM mods WHERE id = ?", mod.id);
		// 	await Logs(client.userId, `The client removed the mod ${mod.name}`, client.ip);
		// 	if (mod.dependencies) {
		// 		for (const dependency of JSON.parse(mod.dependencies)) {
		// 			await deleteMod(dependency);
		// 		}
		// 	}
		// }

		// await deleteMod(args);
		reply(200, "The server removed the mod from the mod list");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;