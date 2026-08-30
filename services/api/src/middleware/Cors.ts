import { FastifyPluginAsync } from "fastify";
import cors from "@fastify/cors";

const middleware: FastifyPluginAsync = async (app) => {
	await app.register(cors, {
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);
			if (!process.env.ALLOWED_ORIGIN) {
				if (process.env.DEBUG === "TRUE") {
					return callback(null, true);
				}
				return callback(new Error("The server failed to verify whether the request complied with CORS."), false);
			}
			if (process.env.ALLOWED_ORIGIN!.split(" ").find((url) => url === origin)) return callback(null, true);
			callback(new Error("The CORS policy for this does not allow access from the specified Origin"), false);
		},
		credentials: true,
	});
};

module.exports = middleware;