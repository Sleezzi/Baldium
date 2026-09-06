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
		if (typeof args !== "number") {
			await reply(400, "Invalid request");
			return;
		}
		await queryAsync("UPDATE backup SET keep = ? LIMIT 1", args);
		await fetch(`http://${process.env.BACKUP}/set-keep`, {
			method: "PUT",
			headers: {
				"x-internal-secret": process.env.INTERNAL_SECRET!
			},
			body: JSON.stringify(args)
		});

		await Logs(client.userId, "The client has changed the number of backups to be retained.", client.ip);

		await reply(200, "Success");
	} catch (err) {
		console.error(err);
		await reply(500, "Internal error");
	}
}

module.exports = route;