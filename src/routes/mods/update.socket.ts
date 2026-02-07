import Download from "../../components/download";
import { Socket } from "../../types/Route";
import { existsSync, mkdirSync, rmSync } from "fs";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

type ModDetails = {
	game_versions: string[],
	loaders: string[],
	id: string,
	project_id: string,
	author_id: string,
	featured: boolean,
	name: string,
	version_number: string,
	changelog: null | string,
	changelog_url: null | string,
	date_published: string,
	downloads: number,
	version_type: "release",
	status: "listed",
	requested_status: null,
	files: {
		id: string,
		url: string,
		filename: string,
	}[],
	dependencies: {
		version_id: null,
		project_id: string,
		file_name: null,
		dependency_type: "required" | "optional"
	}[]
}

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("mods", client.permissions)) {
			Logs(client.username, "The client attempted to update a mod but does not have the necessary permissions", client.ip);
			reply(403, "You're not allowed to update mods");
			return;
		}
		if (!args || typeof args !== "string") {
			Logs(client.username, "The client attempted to update a mod but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid args");
			return;
		}
		const mods: { id: string, name: string }[] = await queryAsync("SELECT id, name FROM mods WHERE id = ? AND maintained = 1 LIMIT 1", args) as any;
		if (mods.length === 0) {
			Logs(client.username, `The client attempted to update the mod ${args} but it does not exist in the server's mod list`, client.ip);
			reply(404, "Mod not found");
			return;
		}
		const mod = mods[0];
		const modDetails: ModDetails[] = await fetch(`https://api.modrinth.com/v2/project/${args}/version`)
		.then((response) => response.json())
		.catch((err) => {
			Logs(client.username, "The client attempted to update a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
			reply(500, "Internal error");
			console.error(err);
		});
		if (!("length" in modDetails)) {
			Logs(client.username, "The client attempted to update a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
			reply(500, "Internal error");
			return;
		}
		const detailsFiltredByModLoader = modDetails.filter((detail) => detail.loaders.find((modloader) => modloader === process.env.MODLOADER));
		if (detailsFiltredByModLoader.length === 0) {
			Logs(client.username, "The client attempted to update a mod, but the mod does not have a version compatible with the modloader on Modrinth.", client.ip);
			reply(404, "The requested mod does not have a version compatible with the modloader.");
			return;
		}
		const detailsFiltredByModLoaderAndMinecraftVersion = detailsFiltredByModLoader.filter((detail) => detail.game_versions.find((version) => version === process.env.VERSION));
		if (detailsFiltredByModLoaderAndMinecraftVersion.length === 0) {
			Logs(client.username, "The client attempted to update a mod, but the mod does not have a version compatible with the version of Minecraft on Modrinth.", client.ip);
			reply(404, "The requested mod does not have a version compatible with this version of Minecraft.");
			return;
		}
		const latest = detailsFiltredByModLoaderAndMinecraftVersion.filter((detail) => detail.version_type === "release")[0] || detailsFiltredByModLoaderAndMinecraftVersion[0];
		if (!latest.name) {
			Logs(client.username, "The client attempted to update a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
			reply(500, "Internal error");
			return;
		}

		if (latest.name === mod.name) {
			Logs(client.username, "The client attempted to update a mod, but it is already up to date", client.ip);
			reply(425, "The mod is already up to date");
			return;
		}
		if (existsSync(`${process.env.SERVER_PATH}/mods/${mod.name}`)) {
			reply(102, "The server is deleting the old version of the mod");
			rmSync(`${process.env.SERVER_PATH}/mods/${mod.name}`);
			reply(102, "The old version of the mod has been removed");
		}
		reply(102, "The server is installing the new version of the mod");
		mkdirSync(`${process.env.SERVER_PATH}/mods/${latest.name}`);
		for (const file of latest.files) {
			await Download(file.url, `${process.env.SERVER_PATH}/mods/${latest.name}/${file.filename}`)
			.catch(() => {
				Logs(client.username, "The client attempted to update a mod, but but an error has occurred", client.ip);
				reply(500, "Failed to download the update");
			});
		}
		reply(102, "The server has installed the latest version of the mod");
		for (const dependency of latest.dependencies) {
			if (dependency.dependency_type === "optional") continue;
		}

		reply(102, "The server is updating its mod list");
		await queryAsync("UPDATE mods SET name = ? WHERE id = ?", latest.name, args);
		Logs(client.username, `The client updated the mod ${args} with the name "${mod.name}"`, client.ip);
		reply(200, "The server has updated its mod list");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;
