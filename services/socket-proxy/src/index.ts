console.log("Starting...");

if (!process.env.PORT) {
	throw new Error("The server's port is not present in the environment variables.");
}

import { WebSocketServer } from "ws";
import { v4 as uuid } from "uuid";
import Docker from "dockerode";
import type { Action, Info, Response } from "@baldium/shared-types/src/Docker";

const connections = new Map<string, (message: Info["request"], args: any) => void>();

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const minecraft = docker.getContainer(process.env.MINECRAFT_CONTAINER!);

const trigger = (message: Info["request"], args: any) => {
	for (const [id, callback] of connections.entries()) {
		callback(message, args);
	}
}

(async () => {
	const options: Docker.ContainerLogsOptions & {
		follow: true;
	} = {
		stderr: true,
		stdout: true,
		follow: true,
		timestamps: true,
	}
	let stream = await minecraft.logs(options);

	const reconnect = () => setTimeout(async () => {
		try {
			stream = await minecraft.logs(options);
		} catch (err) {
			console.error(err);
		}
	}, 1000);

	stream.on("data", (chunk: Buffer) => {
		try {
			trigger("log", chunk.toString("utf8"));
		} catch (err) {
			console.error(err);
		}
	});
	
	stream.on("error", () => {
		try {
			trigger("log", "[SOCKET] [Error] Connection to the server ended, raison: error");
			reconnect();
		} catch (err) {
			console.error(err);
		}
	});
	stream.on("end", () => {
		try {
			trigger("log", "[SOCKET] [Error] Connection to the server ended");
			reconnect();
		} catch (err) {
			console.error(err);
		}
	});
})();

(async () => {
	const stream = await minecraft.stats({ stream: true });

	stream.on("data", (chunk) => {
		try {
			const stats = JSON.parse(chunk.toString());
			
			trigger("analytics", {
				ram: {
					usage: stats.memory_stats.usage,
					limit: stats.memory_stats.limit
				},
				cpus: {
					delta: (stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage),
					systemDelta: (stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage),
					core: stats.cpu_stats.online_cpus
				}
			});
		} catch (err) {
			console.error(err);
		}
	});
})();

const wss = new WebSocketServer({ autoPong: true, port: process.env.PORT as any });

wss.on("connection", (ws) => {
	const id = uuid();
	trigger("log", `[SOCKET] [INFO] A new connection to the socket has been set (${id})`);
	
	ws.on("message", async (raw) => {
		try {
				// Normalizes outgoing responses to the message envelope expected by clients.
				const reply = (response: any, request: Action, id: string) => {
				try {
					ws.send(JSON.stringify({
						type: "response",
						id: id,
						request: request,
						response: response
					}));
				} catch (err) {
					console.error(err);
				}
			}
		
			const message: { id: Response["id"], request: Response["request"] } = JSON.parse(raw.toString());
			if (!("request" in message)) return;
			switch (message.request) {
				case "Status":
					const { State } = await minecraft.inspect();
					reply(State.Running === true, message.request, message.id);
					break;
				case "Start":
					await minecraft.start();
					reply("Success", message.request, message.id);
					break;
				case "Stop":
					await minecraft.stop();
					reply("Success", message.request, message.id);
					break;
				case "Restart":
					await minecraft.restart();
					reply("Success", message.request, message.id);
					break;
				case "RestartMe":
					reply("Will restart soon", message.request, message.id);
					await docker.getContainer(process.env.API_CONTAINER!).restart();
					break;
				default:
					break;
			}
		} catch (error) {
			console.error(error);
			trigger("log", `[SOCKET] [ERROR] The socket rescieve the message "${raw.toString()}" but an error occured`);
		}
	});
	connections.set(id, (message, args) => {
		ws.send(JSON.stringify({
			type: "info",
			request: message,
			args: args
		}));
	});
	ws.once("close", () => {
		connections.delete(id);
	});
});

wss.once("listening", () => trigger("log", `[SOCKET] [INFO] The WebSocket is ready on port ${process.env.PORT}`));