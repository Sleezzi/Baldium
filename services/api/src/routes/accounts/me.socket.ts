import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route";
import { Accounts } from "@baldium/shared-types/src/Database";
import { decipher } from "../../components/crypt";

const route: Socket = async (client, args, reply) => {
	try {
		const accounts: Omit<Omit<Omit<Omit<Accounts, "hash">, "version">, "permissions">, "discord">[] = await queryAsync("SELECT username, email FROM accounts WHERE id = ? LIMIT 1", client.userId);
		if (accounts.length === 0) {
			reply(404, "Can't find the user's account");
			await Logs(client.userId, "The client attempted to retrieve their profile, but it cannot be found in the database.", client.ip);
			return;
		}
		const account = accounts[0];

		await Logs(client.userId, "The client has retrieved their profile.", client.ip);
		reply(200, {
			username: account.username,
			email: decipher(account.email)
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;