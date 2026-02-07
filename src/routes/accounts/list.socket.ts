import { Socket } from "../../types/Route";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			Logs(client.username, "The client attempted to view the list of accounts but does not have sufficient permissions to", client.ip);
			reply(403, "You can't access to this");
			return;
		}
		Logs(client.username, "The client accessed the list of accounts", client.ip);
		const accounts = await queryAsync("SELECT username FROM accounts");
		
		reply(200, accounts);
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;