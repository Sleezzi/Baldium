import { readdir } from "fs/promises";

const IndexFolder = async (path: string) => {
	try {
		let files: {
			type: "file" | "folder",
			path: string
		}[] = [];

		const indexer = async (p: string) => {
			for (const file of (await readdir(p, { withFileTypes: true }))) {
				const pathFile = `${p}/${file.name}`;
				
				if (file.isDirectory()) {
					files.push({
						type: "folder",
						path: pathFile
					});
					await indexer(pathFile);
					continue;
				}
				if (file.isFile()) {
					files.push({
						type: "file",
						path: pathFile
					});
					continue;
				}
			}
		}
		await indexer(path);
		return files;
	} catch (err) {
		console.error(err);
	}
	return [];
}

export default IndexFolder;