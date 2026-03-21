import { Socket } from "../../types/Route";
import { Subscribe, Unsubscribe } from "../../components/subscription";
import checkPermission from "../../components/permissions";
import Logs from "../../components/logs";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (!checkPermission("read_console", client.permissions)) {
			await Logs(client.userId, "The client attempted to subscribe to the console channel but does not have the necessary permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (subscriptionId) {
			await Logs(client.userId, "The client has unsubscribed from the console channel", client.ip);
			Unsubscribe(subscriptionId);
			reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.userId,
			"console",
			60 * 1000 * 10,
			(logs) => reply(103, logs),
			() => reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe."),
		);
		if (!id) {
			await Logs(client.userId, "The client attempted to subscribe to the console channel, but their subscription was not registered.", client.ip);
			reply(502, "Internal error");
			return;
		}
		await Logs(client.userId, "The client subscribed to the console channel", client.ip);
		reply(207, id);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;