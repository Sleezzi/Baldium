import { FastifyPluginAsync } from "fastify";
import cors from "@fastify/cors";

const middleware: FastifyPluginAsync = async (app) => {
	await app.register(cors, {
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);
			if (!process.env.ALLOWED_ORIGIN) return callback(null, true);
			if (process.env.ALLOWED_ORIGIN!.split(" ").find((url) => url === origin)) return callback(null, true);
			callback(new Error("The CORS policy for this does not allow access from the specified Origin"), false);
		},
		credentials: true,
	});
};

module.exports = middleware;