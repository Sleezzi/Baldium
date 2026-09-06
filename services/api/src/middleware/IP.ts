// plugins/client-ip.ts
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		clientIP: string;
	}
}

function extractClientIP(req: FastifyRequest): string | undefined {
	const cfConnectingIP = req.headers["cf-connecting-ip"];
	if (!cfConnectingIP) return;
	
	return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
}



const middleware = async (app: FastifyInstance) => {
	app.addHook("onRequest", async (req, reply) => {
		const ip = extractClientIP(req);

		if (!ip) {
			return reply.code(400).send("Unable to determine client IP");
		}

		req.clientIP = ip;
	});
}

module.exports = middleware;