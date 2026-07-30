import queryAsync from "../../components/queryAsync";
import { Socket } from "../../../types/Route";
import { checkPermission } from "../../components/account";
import connections from "../../components/connections";

const route: Socket = async (client, args: number, reply) => {
	try {
		if (typeof args !== "number") {
			reply(400, "Can't find the user's accounts");
			return;
		}
		if (!checkPermission("admin", client.permissions)) {
			reply(403, "You do not have permission to access another user's profile");
			return;
		}
		const accounts: { discord: number | null, id: string, username: string, email: string, permissions: number }[] = await queryAsync("SELECT username, email, permissions, discord FROM accounts WHERE id = ?", args);
		if (accounts.length === 0) {
			reply(404, "Can't find the user's account");
			return;
		}
		const account = accounts[0];

		reply(200, {
			online: connections.has(args),
			discord: account.discord,
			username: account.username,
			permissions: account.permissions,
			email: `${account.email.split("@")[0].slice(0, 3)}${"*".repeat(Math.min(account.email.split("@")[0].length - 3, 5))}@${account.email.split("@")[1]}`
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;