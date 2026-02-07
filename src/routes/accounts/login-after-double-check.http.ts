import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import Logs from "../../components/logs";
import { Connection } from "../../types/Accounts";
import { createHash, timingSafeEqual, createHmac } from "crypto";
import generateNewToken from "../../components/generateNewToken";


const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const body: {
				email: string;
				code: string;
			} = request.body;
			if (!body) {
				Logs("rejection", "The client attempted to connect but did not provide a body in their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.email || typeof body.email !== "string") {
				Logs("rejection", "The client attempted to log in but did not provide a username in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.code || typeof body.code !== "string") {
				Logs("rejection", "The client attempted to log in but did not provide a password in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				response.status(500).json({
					status: 500,
					response: "Internal error"
				});
				return;
			}

			const connections: Connection[] = await queryAsync("SELECT code, code_expire_in, attempts FROM connections WHERE email = ?", body.email.toLowerCase());
			if (connections.length === 0) {
				Logs("rejection", "The client attempted to log in, but their account was not found in the database", request.ip);
				response.status(403).json({ // /!\
					status: 403,
					response: "This code has expired."
				});
				return;
			}
			const connection = connections[0];

			if (connection.code_expire_in - Date.now() / 1000 < 0) {
				Logs("rejection", "The client attempted to log in, but their account was not found in the database", request.ip);
				response.status(403).json({
					status: 403,
					response: "This code has expired."
				});
				return;
			}
			if (!timingSafeEqual(
				Buffer.from(createHash("sha256").update(body.code).digest("hex")),
				Buffer.from(connection.code)
			)) {
				Logs("rejection", "", request.ip);
				response.status(403).json({
					status: 403,
					response: "This accounts doesn't not exist" // /!\
				});
				
				if (connection.attempts > 5) {
					await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", body.email.toLowerCase());
				} else {
					await queryAsync("UPDATE connections SET attempts = attempts + 1 WHERE email = ?", body.email.toLowerCase());
				}
				return;
			}

			const account = await queryAsync("SELECT username FROM accounts WHERE email = ?", body.email.toLowerCase());
			
			const token = generateNewToken(account.username);

			Logs(account.username, "The client logged into their account after email verification.", request.ip);

			if (await queryAsync("SELECT COUNT(*) FROM user_ip WHERE username = ?", account.username) >= 5) {
				await queryAsync("DELETE FROM user_ip WHERE username = ? ORDER BY last_connection ASC LIMIT 1", account.username);
			}
			const ipapi = await fetch(`http://ip-api.com/json/${request.ip}?fields=status,lat,lon,proxy,hosting`);
			if (ipapi.status !== 200) {
				response.status(500).json({
					status: 500,
					response: "We are unable to verify your connection."
				});
				return;
			}
			const ipdata: {
				status: "success",
				lat: number,
				lon: number,
				proxy: boolean,
				hosting: boolean
			} = await ipapi.json();
			if (ipdata.status !== "success") {
				response.status(500).json({
					status: 500,
					response: "We are unable to verify your connection."
				});
				return;
			}
			if (ipdata.proxy || ipdata.hosting) {
				response.status(403).json({
					status: 403,
					response: "It appears you are using a proxy or VPN. The use of these services is not permitted."
				});
				return;
			}
			await queryAsync("INSERT INTO user_ip (username, ip, ip_hash, last_connection, location) VALUES (?, ?, ?, ?, ST_PointFromText(?, ?))",
				account.username,
				/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(request.ip) ? `${request.ip.split(".")[0]}.*.*.${request.ip.split(".")[3]}` : `${request.ip.split(":")[0]}:${"****:".repeat(request.ip.split(":").slice(1, -1).length)}${request.ip.split(":").at(-1)}`,
				createHmac("sha256", process.env.SECRET_KEY).update(request.ip).digest("hex"),
				Date.now() / 1000,
				ipdata.lat,
				ipdata.lon
			);


			await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", body.email.toLowerCase());

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