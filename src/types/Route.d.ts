import type Client from "./Client";

import { Request, Response } from "express";

export type HTTP = {
	uri?: string,
	method: "GET" | "PUT" | "POST" | "DELETE",
	execute: (request: Request & { ip: string }, response: Response) => void,
}

export type Socket = (client: Client & { ip: string }, args: any, reply: (status: number, response: any) => void) => void;