
import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { Message, Response } from "@baldium/shared-types/src/Docker.js";
import { Trigger } from "./subscription.js";

if (!process.env.SOCKET_DOCKER_PROXY) {
	throw new Error("The address used to connect to the docker's socket proxy is not present in the environment variables.");
}

const ws = new WebSocket(process.env.SOCKET_DOCKER_PROXY!);

const requests = new Map<string, (response: Response["response"]) => void>();

export const logs: string[] = [];

export function sendAction(action: Response["request"]): Promise<any> {
	const id = uuid();
	ws.send(JSON.stringify({
		id: id,
		request: action,
	}));
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			requests.delete(id);
			reject("timed out");
		}, 1000);
		requests.set(id, (response) => {
			requests.delete(id);
			resolve(response);
		});
	});
}

ws.on("message", (data) => {
	const message: Message = JSON.parse(data.toString());
	if (message.type === "response") {
		if (!requests.has(message.id)) return;
		const callback = requests.get(message.id)!;
		callback(message.response);
		return;
	}
	if (message.request === "analytics") {
		Trigger("server_analysis", message.args);
		return;
	}
	if (message.request === "log") {
		Trigger("console", message.args);
		logs.push(message.args);
		if (logs.length > 1000) {
			logs.splice(0, logs.length - 1000);
		}
		return;
	}
	console.error(`The message "${message.request}" from the Docker proxy is not recognized by the API`);
});