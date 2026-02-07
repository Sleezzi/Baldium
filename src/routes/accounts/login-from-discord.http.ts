import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import Logs from "../../components/logs";
import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import Account, { Ips, Connection } from "../../types/Accounts";
import generateNewToken from "../../components/generateNewToken";

const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const auth = request.headers.authorization;
			if (!auth) {
				Logs("rejection", "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (typeof auth !== "string") {
				Logs("rejection", "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!auth.startsWith("Bearer ")) {
				Logs("rejection", "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			const discord = await fetch("https://discord.com/api/users/@me", {
				headers: {
					Authorization: `Bearer ${auth.slice(7)}`
				}
			}).then((_response) => _response.json());
			
			if (!("id" in discord)) {
				Logs("rejection", "The client attempted to log in with their Discord account but did not provide a valid login token", request.ip);
				response.status(403).json({
					status: 403,
					response: "This accounts doesn't not exist"
				});
				return;
			}
			const accounts: Account[] = await queryAsync("SELECT username, email FROM accounts WHERE discord = ?", discord.id);
			
			if (accounts.length === 0) {
				Logs("rejection", "The client attempted to log in with their Discord account, but their Discord account is not linked to any account", request.ip);
				response.status(403).json({
					status: 403,
					response: "This accounts doesn't not exist"
				});
				return;
			}
			const account = accounts[0];

			const connections: Connection[] = await queryAsync("SELECT ips FROM connections WHERE username = ?", account.username);
			const hashedIp = createHash("sha256").update(request.ip).digest("hex");
			const id = uuid().split("-")[4];
			const newConnection: Ips[] = [{ hash: hashedIp, id: id, "last-connection": Date.now() / 1000, ip: request.ip }];
			
			Logs(account.username, "The client logged in using their Discord account", request.ip);
			const token = generateNewToken(account.username);
			
			newConnection.push({
				"last-connection": Date.now() / 1000,
				hash: createHash("sha256").update(request.ip).digest("hex"),
				id: id,
				ip: request.ip
			});

			response.json({
				status: 200,
				response: token
			});
		} catch (err) {
			console.error(err);
			response.status(500).json({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;