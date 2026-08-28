import { Socket } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import connections from "../../components/connections";
import { v4 as uuid } from "uuid";

const route: Socket = async (client, args: number, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to disconnect a user but does not have sufficient permissions to", client.ip);
			reply(403, "You can't access to this");
			return;
		}

		if (typeof args !== "number") {
			await Logs(client.userId, "The client attempted to disconnect a user but did not provide a valid ID.", client.ip);
			reply(400, "Invalid user id");
			return;
		}

		if (args === 1) {
			await Logs(client.userId, "The client attempted to disconnect the owner", client.ip);
			reply(403, "You can't access to this");
			return;
		}
		const accounts: { id: number, username: string }[] = await queryAsync("SELECT username FROM accounts WHERE id = ? LIMIT 1", args);
		if (accounts.length === 0) {
			await Logs(client.userId, `The client attempted to disconnect the user #${args} but no account where found`, client.ip);
			reply(404, "Can't find the user's account");
			return;
		}
		const connection = connections.get(accounts[0].id);

		const version = uuid();

		await queryAsync("UPDATE accounts SET version = ? WHERE id = ? LIMIT 1", version, accounts[0].id);

		if (connection) {
			connection.close("An administrator has logged you out. Log back into your account to access Baldium services.");
		}
		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;