import { Socket } from "../../../types/Route";
import { Subscribe, Unsubscribe } from "../../../components/subscription";
import checkPermission from "../../../components/permissions";
import Logs from "../../../components/logs";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (subscriptionId) {
			await Logs(client.userId, "The client has unsubscribed from the server's status channel", client.ip);
			Unsubscribe(subscriptionId);
			reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.userId,
			"server_status",
			60 * 1000 * 5,
			(stats) => reply(103, stats),
			() => reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe.")
		);
		if (!id) {
			await Logs(client.userId, "The client attempted to subscribe to the server's status channel, but their subscription was not registered.", client.ip);
			reply(502, "Internal error");
			return;
		}
		await Logs(client.userId, "The client subscribed to channel server's status", client.ip);
		reply(207, id);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;