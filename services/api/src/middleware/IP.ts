// plugins/client-ip.ts
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";

declare module "fastify" {
	interface FastifyRequest {
		clientIP: string;
	}
}

function extractClientIp(req: FastifyRequest): string | null {
	const cfConnectingIp = req.headers["cf-connecting-ip"];
	if (cfConnectingIp) {
		return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
	}

	const forwardedFor = req.headers["x-forwarded-for"];
	if (forwardedFor) {
		const value = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
		return value.split(",")[0].trim();
	}

	if (req.socket.remoteAddress) {
		return req.socket.remoteAddress;
	}

	return null;
}



const middleware = async (app: FastifyInstance) => {
	await app.register(
		fp(
			async (_app: FastifyInstance) => {
				_app.decorateRequest("clientIp", null);

				_app.addHook("onRequest", async (req, reply) => {
					const ip = extractClientIp(req);

					if (!ip) {
						return reply.code(400).send("Unable to determine client IP");
					}

					req.clientIP = ip;
				});
			},
			{ name: "client-ip" },
		)
	);
}

module.exports = middleware;