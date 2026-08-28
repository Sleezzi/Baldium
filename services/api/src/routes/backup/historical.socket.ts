import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route";
import { Backup } from "@baldium/shared-types/src/Database";
import { checkPermission } from "../../components/account";
import { getBackup } from "../../components/r2";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		
		await Logs(client.userId, "The client retrieved the backup historical.", client.ip);

		reply(200, {
			max: 10_737_418_240, // 10Go
			historical: await getBackup()
		});
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;