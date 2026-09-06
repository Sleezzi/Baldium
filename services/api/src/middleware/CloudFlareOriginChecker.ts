
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { isCloudflare, isCloudflareIp } from "../components/cloudflare";

const middleware = async (app: FastifyInstance) => {
	app.addHook("onRequest", async (request, reply) => {
		if (process.env.DEBUG === "TRUE") return;
		const realip = request.headers["x-real-ip"]; // This header is created by NGINX; it allows retrieving the actual IP address, whereas `request.ip` returns only the IP used by Docker.
		if (!realip) {
			return reply.code(400).send("Unable to determine client IP");
		}
		if (!isCloudflareIp(realip.toString())) {
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

module.exports = middleware;