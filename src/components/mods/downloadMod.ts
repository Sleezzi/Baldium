import { mkdir } from "fs/promises";
import type Client from "../../../types/Client";
import Logs from "../logs";
import queryAsync from "../queryAsync";
import Download from "../files/download";
import getVersion from "./getVersion";

type CallbackStatus = "INTERNAL_ERROR"
| "NOT_AVAILABLE"
| "STARTING_DOWNLOAD"
| "MOD_DOWNLOADED"
| "STARTING_DOWNLOAD_DEPENDENCIES"
| "DONE";

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

/**
 * Downloads a mod from Modrinth, installs matching files for the configured
 * Minecraft version/modloader, recursively installs required dependencies,
 * then persists installation metadata in the database.
 */
const getMod = async (client: Client & { ip: string }, id: string, callback: (status: CallbackStatus, modName?: string) => void) => {
	try {
		const latest = await getVersion(id);
		if (!latest) return;
		
		callback("STARTING_DOWNLOAD", latest.name);
		await mkdir(`${process.env.SERVER_PATH}/mods/${id}`);
		await new Promise<void>((resolve, reject) => {
			try {
				let downloaded = 0;
				for (const file of latest.files) {
					Download(file.url, `${process.env.SERVER_PATH}/mods/${id}/${file.filename}`)
					.then(() => {
						downloaded++;
					})
					.catch(async () => {
						await Logs(client.userId, `The client attempted to add the mod ${id} but the server failed to download it`, client.ip);
						callback("INTERNAL_ERROR", latest.name);
					});
					if (downloaded === latest.files.length) {
						resolve();
					}
				}
			} catch (err) {
				console.error(err);
				reject(err);
			}
		});
		callback("STARTING_DOWNLOAD_DEPENDENCIES", latest.name);
		for (const dependency of latest.dependencies) {
			if (dependency.dependency_type === "optional") continue;
			queryAsync("SELECT id FROM mods WHERE id = ?", dependency.project_id).then((isDownloaded) => {
				if (isDownloaded && isDownloaded.length !== 0) return;
				getMod(client, dependency.project_id, (status, modName) => callback(status, modName || dependency.file_name || undefined));
			});
		}
		
		
		await Logs(client.userId, `The client added the mod ${id} with the name "${latest.name}"`, client.ip);
		callback("DONE", latest.name);
	} catch (err) {
		console.error(err);
		callback("INTERNAL_ERROR");
		return;
	}
};

export default getMod;