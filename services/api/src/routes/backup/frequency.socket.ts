import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await reply(403, "You can't access to this ressource");
			return;
		}
		if (args < 6) {
			await reply(400, "A minimum of 6 hours must elapse between each backup.");
			return;
		}
		await queryAsync("UPDATE backup SET frequency = ? LIMIT 1", args);
		await fetch(`http://${process.env.BACKUP}/set-frequency`, {
			method: "PUT",
			headers: {
				"x-internal-secret": process.env.INTERNAL_SECRET!
			},
			body: args
		});

		await Logs(client.userId, "The client changed the backup frequency.", client.ip);

		await reply(200, "Success");
	} catch (err) {
		console.error(err);
		await reply(500, "Internal error");
	}
}

module.exports = route;