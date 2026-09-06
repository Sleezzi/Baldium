import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../../components/queryAsync";


import properties from "../../../components/files/server.properties";
import Logs from "../../../components/logs";
import { checkPermission } from "../../../components/account";
import { authenticate } from "../../../components/account";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const route: HTTP<{
	Headers: {
		cookie: string
	},
}, {}> = {
	uri: "/files/server.properties",
	method: "GET",
	schema: {
		headers: {
			type: "object",
			properties: {
				cookie: {
					type: "string"
				}
			},
			required: ["cookie"]
		},
	},
	prehandler: async (request, response, done) => {
		if (!request.headers.cookie) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		const token = request.headers.cookie.split("; ").find((cookie) => cookie.startsWith("token="));
		if (!token) { // Checks if the client has correctly provided a token in their request
			await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
			return response.status(403).send({
				status: 403,
				response: "Invalid auth"
			});
		}
		
		const connection = await authenticate(token.split("token=")[1]);
		if (!connection.success) {
			switch (connection.message) {
				case "INVALID_TOKEN":
					await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
					response.status(401).send({
						response: "Invalid token",
						status: 401
					});
					break;
				case "MISSING_PAYLOAD":
					await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "We are unable to properly authenticate the user because the token's payload is not readable",
						status: 403
					});
					break;
				case "INVALID_PAYLOAD":
					await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "We are unable to properly authenticate the user because the token's payload is not readable",
						status: 403
					});
					break;
				case "INVALID_USERID":
					await Logs(null, "The handshake with the client failed because the userId is invalid.", request.clientIP);
					response.status(403).send({
						response: "Unable to authenticate you because the user ID in the token payload is invalid.",
						status: 403
					});
					break;
				case "INVALID_VERSION":
					await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
					response.status(403).send({
						response: "Unable to authenticate you because the version in the token payload is invalid.",
						status: 403
					});
					break;
				default:
					response.status(500).send({
						response: "Internal error",
						status: 500
					});
					break;
			}
			return;
		}
		const user = connection.message;
		const accounts: { id: string, permissions: number }[] = await queryAsync("SELECT permissions FROM accounts WHERE id = ? LIMIT 1", user);
		if (accounts.length === 0) {
			await Logs(null, "The client attempted to read server.properties but did not provide a valid token", request.clientIP);
			return response.status(401).send({
				response: "Invalid token",
				status: 401
			});
		}
		if (!checkPermission("manage_files", accounts[0].permissions)) {
			await Logs(user, "The client attempted to read server.properties, but their account does not have the necessary permissions", request.clientIP);
			return response.status(403).send({
				response: "You can't access to this ressource",
				status: 403
			});
		}
	},
	handler: async (request, response) => {
		try {
			const path = join(process.env.SERVER_PATH!, "server.properties");
			const content = await readFile(path, { encoding: "utf-8" });
			const lines = content.split("\n");
			
			const result: { [key: string]: any } = {};

			const options = Object.keys(properties);

			for (const line of lines
				.filter((line) => !line.startsWith("#"))
				.filter((line) => options.find((prop) => prop === line.split("=")[0]))
			) {
				const [option, value] = line.split("=") as any;
				const type: "string" | "number" | "boolean" = (properties as any)[option];
				if (type === "number") {
					result[option] = Number(value);
					continue;
				}
				if (type === "boolean") {
					result[option] = value === "true";
					continue;
				}
				result[option] = value;
			}

			response
			.status(200)
			.send({
				status: 200,
				response: result
			});
		} catch (err) {
			console.error(err);
			return response.status(500).send({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;