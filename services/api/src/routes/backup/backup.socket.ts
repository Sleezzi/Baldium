import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		await fetch(`http://${process.env.BACKUP}/backup`, { method: "POST", });

		await Logs(client.userId, "The client manually started a backup.", client.ip);

		reply(200, "Success");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;