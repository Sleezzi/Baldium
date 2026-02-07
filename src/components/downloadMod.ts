import { mkdirSync } from "fs";
import type Client from "../types/Client";
import Logs from "./logs";
import queryAsync from "./queryAsync";
import Download from "./download";

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

const getMod = async (client: Client & { ip: string }, id: string, reply: (code: number, message: any) => void) => {
	const exist = await queryAsync("SELECT * FROM mods WHERE id = ?", id);

	if (exist.length > 0) {
		Logs(client.username, "The client attempted to add a mod, but it is already installed", client.ip);
		reply(409, "The mod has already been added");
		return;
	}
	
	const modDetails: ModDetails[] = await fetch(`https://api.modrinth.com/v2/project/${id}/version`)
	.then((response) => response.json())
	.catch((err) => {
		Logs(client.username, "The client attempted to add a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
		reply(500, "Internal error");
		console.error(err);
	});
	if (!("length" in modDetails)) {
		Logs(client.username, "The client attempted to add a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
		reply(500, "Internal error");
		return;
	}
	
	const versions = modDetails.filter((version: any) => version.game_versions.includes(process.env.VERSION) && version.loaders.includes(process.env.MODLOADER));
	if (versions.length === 0) {
		Logs(client.username, `The client attempted to add the mod ${id} but no version of the mod exists that matches the server's expectations`, client.ip);
		reply(410, "The mod cannot be downloaded because there is no version that meets the server's requirements");
		return;
	}
	const latest: ModDetails = versions[0];
	if (!latest.version_number) {
		Logs(client.username, "The client attempted to update a mod, but Modrinth responded incorrectly to the server when it tried to retrieve its version", client.ip);
		reply(500, "Internal error");
		return;
	}
	
	reply(102, "The mod download has started");
	mkdirSync(`${process.env.SERVER_PATH}/mods/${latest.name}`);
	for (const file of latest.files) {
		await Download(file.url, `${process.env.SERVER_PATH}/mods/${latest.name}/${file.filename}`)
		.catch(() => {
			Logs(client.username, `The client attempted to add the mod ${id} but the server failed to download it`, client.ip);
			reply(500, "Failed to download the update");
		});
	}
	
	reply(202, "The mod has been downloaded. The server will now download the mod's dependencies.");
	for (const dependency of latest.dependencies) {
		if (dependency.dependency_type === "optional") continue;
		await getMod(client, dependency.project_id, reply);
	}
	await queryAsync("INSERT INTO mods (id, name, dependencies) VALUES (?, ?, ?)", id, latest.name, JSON.stringify(latest.dependencies.filter((dependency) => dependency.dependency_type === "required").map((dependency) => dependency.project_id)));
	
	Logs(client.username, `The client added the mod ${id} with the name "${latest.name}"`, client.ip);
};

export default getMod;