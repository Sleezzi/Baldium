import { FastifyRequest, FastifyReply, FastifySchema, HookHandlerDoneFunction,  } from "fastify";
import type Client from "./Client";

type RouteGeneric = {
	Body?: unknown
	Querystring?: unknown
	Params?: unknown
	Headers?: unknown
}

export type HTTP<
T extends RouteGeneric = RouteGeneric,
/**
 * This typing will be added to the handler function. It is useful when, during the `preHandler` phase, you do something like:
 * ```ts
 * request.exemple = "exemple";
 * ```
*/
postPreHandler extends any = any
> = {
	uri?: string,
	method: "GET" | "PUT" | "POST" | "DELETE",
	schema: FastifySchema,
	prehandler?: (
		request: FastifyRequest<T>,
		response: FastifyReply,
		done: HookHandlerDoneFunction
	) => void,
	handler: (
		request: FastifyRequest<T> & postPreHandler & { ip: string },
		response: FastifyReply
	) => void,
}

export type Socket = (
	client: Client & { ip: string },
	args: any,
	reply: (status: number, response: any) => void
) => void;