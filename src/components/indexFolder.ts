import { readdirSync } from "fs";

const IndexFolder = (path: string) => {
	try {
		let files: {
			type: "file" | "folder",
			path: string
		}[] = [];

		const indexer = (p: string) => {
			for (const file of readdirSync(p, { withFileTypes: true })) {
				const pathFile = `${p}/${file.name}`;
				
				if (file.isDirectory()) {
					files.push({
						type: "folder",
						path: pathFile
					});
					indexer(pathFile);
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
		indexer(path);
		return files;
	} catch (error) {
		console.error();
	}
	return [];
}

export default IndexFolder;