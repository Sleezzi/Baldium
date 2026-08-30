
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { isCloudflare, isCloudflareIp } from "../components/cloudflare";

const middleware = async (app: FastifyInstance) => {
	await app.register(
		fp(
			async (_app: FastifyInstance) => {
				_app.addHook("onRequest", async (request, reply) => {
					if (process.env.DEBUG === "TRUE") return;
					
					if (!request.socket.remoteAddress) {
						return reply.code(400).send("Unable to determine client IP");
					}
					if (!isCloudflareIp(request.socket.remoteAddress)) {
						return reply.code(403).send("You are not among the authenticated origins.");
					}
					const cloudflare_header = request.headers["x-origin-verify"];
					if (!cloudflare_header) {
						return reply.code(403).send("You are not among the authenticated origins.");
					}
					
					if (!isCloudflare(cloudflare_header.toString())) {
						return reply.code(403).send("You are not among the authenticated origins.");
					}
				});
			}
		)
	);
}

module.exports = middleware;