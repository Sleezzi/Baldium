import { createWriteStream } from "fs";

import fetch from "node-fetch";

const Download = async (url: string, path: string) => new Promise<void>(async (resolve, error) => {
	try {
		const response = await fetch(url);
		if (!response.ok) return error(response.statusText);
		if (!response.body) return error("Missing body in response");
		
		const writer = createWriteStream(path);
		response.body.pipe(writer);
		writer.on("finish", () => resolve());
		writer.on("error", () => error());

	} catch (err) {
		return error(err);
	}
});

export default Download;