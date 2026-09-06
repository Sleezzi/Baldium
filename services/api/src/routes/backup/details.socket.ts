import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route";
import { Backup } from "@baldium/shared-types/src/Database";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("manage_files", client.permissions)) {
			await reply(403, "You can't access to this ressource");
			return;
		}
		const backup: Omit<Omit<Backup, "last_backup">, "last_backup_size">[] = await queryAsync("SELECT frequency, keep FROM backup LIMIT 1", client.userId);

		await Logs(client.userId, "The client retrieved the backup details.", client.ip);

		if (backup.length === 0) {
			await reply(200, {
				keep: 5,
				frequency: 6
			});
			return;
		}
		await reply(200, {
			keep: backup[0].keep,
			frequency: backup[0].frequency
		});
	} catch (err) {
		console.error(err);
		await reply(500, "Internal error");
	}
}

module.exports = route;