import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "../../../types/Route";

const route: Socket = async (client, args, reply) => {
	try {
		const accounts: { id: string, username: string, email: string, permissions: number }[] = await queryAsync("SELECT username, email FROM accounts WHERE id = ?", client.userId);
		if (accounts.length === 0) {
			reply(404, "Can't find the user's account");
			await Logs(client.userId, "The client attempted to retrieve their profile, but it cannot be found in the database.", client.ip);
			return;
		}
		const account = accounts[0];

		await Logs(client.userId, "The client has retrieved their profile.", client.ip);
		reply(200, {
			username: account.username,
			email: `${account.email.split("@")[0].slice(0, 3)}${"*".repeat(Math.min(account.email.split("@")[0].length - 3, 5))}@${account.email.split("@")[1]}`
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;