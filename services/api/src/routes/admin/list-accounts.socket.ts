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
			reply(403, "You can't access to this");
			return;
		}
		await Logs(client.userId, "The client accessed the list of accounts", client.ip);
		const accounts: Omit<Omit<Accounts, "hash">, "version">[] = await queryAsync("SELECT id, username, email, discord, permissions FROM accounts");
		
		reply(200, accounts.map((user) => {
			const online = connections.has(user.id);
			const email = decipher(user.email);
			return {
				id: user.id,
				username: user.username,
				email: `${email.split("@")[0].slice(0, 3)}${"*".repeat(Math.min(email.split("@")[0].length - 3, 5))}@${email.split("@")[1]}`,
				discord: user.discord,
				permissions: user.permissions,
				online: online
			}
		}));
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;