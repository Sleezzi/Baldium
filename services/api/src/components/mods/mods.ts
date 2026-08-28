import { mkdir } from "fs/promises";
import Download from "../files/download.js";
import queryAsync from "../queryAsync.js";

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

class Mod {
	public readonly id: string | null = null;
	public versions: ModDetails[] | null = null;
	public latest: ModDetails | null = null;


	constructor(id: string) {
		this.id = id;
	}
	public async init(): Promise<ModDetails | void> {
		if (!this.id) return;

		const response = await fetch(`https://api.modrinth.com/v2/project/${this.id}/version`);
		if (response.status !== 200) return;

		const modDetails: ModDetails[] = await response.json();
		if (!("length" in modDetails) || modDetails.length === 0) {
			return;
		}
		
		
		this.versions = modDetails.filter((version: any) => version.game_versions.includes(process.env.VERSION) && version.loaders.includes(process.env.MODLOADER));

		if (this.versions.length === 0) {
			return;
		}
		const latest: ModDetails = this.versions[0];
		if (!latest.version_number) {
			return;
		}
		this.latest = latest;
	}
	public async download(version: ModDetails, state: (file: number) => void) {
		if (!this.id) return;

		await mkdir(`${process.env.SERVER_PATH}/mods/${this.id}`);

		let current_file = 0;
		for (let index = 0; index < version.files.length; index++) {
			const file = version.files[index];
			state(index);
			await Download(file.url, `${process.env.SERVER_PATH}/mods/${this.id}/${file.filename}`);
		}
	}
	public dependancies(version: ModDetails) {
		const result: Mod[] = [];
		for (const dependance of version.dependencies.filter((dependance) => dependance.dependency_type === "required")) {
			result.push(new Mod(dependance.project_id));
		}
		return result;
	}
}

export default Mod;