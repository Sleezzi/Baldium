export type Action = "Start" | "Stop" | "Restart" | "Status" | "RestartMe";

export interface Response {
	type: "response",
	id: string,
	request: Action,
	response: any
}

export interface Info {
	type: "info",
	request: "log" | "analytics",
	args: any
}

export type Message = Response | Info;