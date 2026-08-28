import { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";

const middleware: FastifyPluginAsync = async (app) => {
	await app.register(multipart, {
		limits: {
			files: 1,						// Upload file by file
			fileSize: 500 * 1024 * 1024,	// 500 Mo max
		},
	});
};

module.exports = middleware;