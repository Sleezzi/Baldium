import { Socket } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import type { Accounts } from "@baldium/shared-types/src/Database";
import connections from "../../components/connections";
import { decipher } from "../../components/crypt";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to view the list of accounts but does not have sufficient permissions to", client.ip);
			await reply(403, "You can't access to this");
			return;
		}
		if (typeof args !== "number") {
			await Logs(client.userId, "The client attempted get the profile of a user but did not provide a valid ID.", client.ip);
			await reply(400, "Invalid user id");
			return;
		}
		await Logs(client.userId, "The client accessed the list of accounts", client.ip);
		const accounts: Omit<Omit<Accounts, "hash">, "version">[] = await queryAsync("SELECT username, email, discord, permissions FROM accounts WHERE id = ? LIMIT 1", args);
		
		if (accounts.length === 0) {
			await Logs(client.userId, `The client attempted to get the profile of the user #${args} but no account where found`, client.ip);
			await reply(404, "Can't find the user's account");
			return;
		}

		const account = accounts[0];

		await reply(200, {
			id: account.id,
			username: account.username,
			email: decipher(account.email),
			discord: account.discord,
			permissions: account.permissions,
			online: connections.has(account.id)
		});
	} catch (err) {
		console.error(err);
		await reply(500, "Internal error");
	}
}

module.exports = route;