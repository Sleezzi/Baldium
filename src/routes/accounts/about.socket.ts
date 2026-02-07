import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "../../types/Route";

const route: Socket = async (client, args, reply) => {
	try {
		const accounts: { username: string, email: string }[] = await queryAsync("SELECT email FROM accounts WHERE username = ?", client.username);
		if (accounts.length === 0) {
			reply(404, "Can't find the user's accounts");
			return;
		}
		const account = accounts[0];
		const connections = await queryAsync("SELECT ip, last_connection, location, os, navigator FROM user_ip WHERE username = ?", client.username);
		reply(200, {
			email: `${account.email.split("@")[0][0]}${"*".repeat(account.email.split("@")[0].length - 1)}@${account.email.split("@")[1]}`,
			permissions: client.permissions,
			connections: connections,
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;