import { Socket } from "@baldium/shared-types/src/Route.js";
import { Subscribe, Unsubscribe } from "../../components/subscription";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (!checkPermission("read_files", client.permissions)) {
			await Logs(client.userId, "The client attempted to subscribe to the files channel but does not have the necessary permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (subscriptionId) {
			await Logs(client.userId, "The client has unsubscribed from the client channel", client.ip);
			Unsubscribe(subscriptionId);
			reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.userId,
			"files",
			60 * 1000 * 5,
			({ action, path, details }: { action: "deleted" | "file-created" | "folder-created", path: string, details?: any }) => {
				reply(103, {
					action,
					path,
					details
				});
			},
			() => reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe.")
		);
		if (!id) {
			await Logs(client.userId, "The client attempted to subscribe to the client channel, but their subscription was not registered.", client.ip);
			reply(502, "Internal error");
			return;
		}
		await Logs(client.userId, "The client subscribed to channel client", client.ip);
		reply(207, id);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;