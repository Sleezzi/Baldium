import Channel from "../types/Channel";
import docker from "../components/docker";
import { Trigger } from "../components/subscription";

const route: Channel = {
	name: "console",
	execute: async () => {
		try {
			let stream = await docker.logs({
				stderr: true,
				stdout: true,
				follow: true,
				timestamps: false,
			});

			const reconnect = () => setTimeout(async () => {
				try {
					stream = await docker.logs({
						stderr: true,
						stdout: true,
						follow: true,
						timestamps: false,
					});
				} catch (err) {
					console.error(err);
				}
			}, 1000);

			stream.on("data", (chunk: Buffer) => {
				try {
					Trigger("console", chunk.toString("utf8"));
				} catch (err) {
					console.error(err);
				}
			});
			stream.on("error", () => {
				try {
					Trigger("console", ["[Error] Connection to the server ended, raison: error"]);
					reconnect();
				} catch (err) {
					console.error(err);
				}
			});
			stream.on("end", () => {
				try {
					Trigger("console", ["[Error] Connection to the server ended"]);
					reconnect();
				} catch (err) {
					console.error(err);
				}
			});
		} catch (err) {
			console.error(err);
		}
	}
}

module.exports = route;