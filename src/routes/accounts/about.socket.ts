import { createHmac } from "crypto";
import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "../../types/Route";

const route: Socket = async (client, args, reply) => {
	try {
		const accounts: { id: string, email: string }[] = await queryAsync("SELECT email FROM accounts WHERE id = ?", client.userId);
		if (accounts.length === 0) {
			reply(404, "Can't find the user's accounts");
			return;
		}
		const account = accounts[0];
		const connections: {
			id: number,
			ip: string,
			last_connection: number,
			longitude: number,
			latitude: number,
			navigators: string,
			model: string,
			os: string
		}[] = await queryAsync("SELECT id, ip, last_connection, longitude, latitude, navigators, model, os FROM user_ip WHERE userId = ?", client.userId);
		reply(200, {
			email: `${account.email.split("@")[0][0]}${"*".repeat(account.email.split("@")[0].length - 1)}@${account.email.split("@")[1]}`,
			connections: connections,
			current_connection: await queryAsync("SELECT id FROM user_ip WHERE userId = ? AND ip_hash = ?", client.userId, createHmac("sha256", process.env.SECRET_KEY!).update(client.ip).digest("hex"))
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;