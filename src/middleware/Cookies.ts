import { FastifyPluginAsync } from "fastify";
import cookie from "@fastify/cookie";

const middleware: FastifyPluginAsync = async (app) => {
	await app.register(cookie);
};

module.exports = middleware;