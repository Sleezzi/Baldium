import { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";

const middleware: FastifyPluginAsync = async (app) => {
	await app.register(rateLimit, {
		max: 100,
		timeWindow: "15 minutes",
	});
};

module.exports = middleware;