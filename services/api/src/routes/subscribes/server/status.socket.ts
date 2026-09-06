import { Socket } from "@baldium/shared-types/src/Route.js";
import { Subscribe, Unsubscribe } from "../../../components/subscription";
import Logs from "../../../components/logs";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (subscriptionId) {
			Unsubscribe(subscriptionId);
			await reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.userId,
			"server_status",
			60 * 1000 * 5,
			async (stats) => await reply(103, stats),
			async () => await reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe.")
		);
		if (!id) {
			await Logs(client.userId, "The client attempted to subscribe to the server's status channel, but their subscription was not registered.", client.ip);
			await reply(502, "Internal error");
			return;
		}
		await reply(207, id);
	} catch (err) {
		console.error(err);
		await reply(502, "Internal error");
	}
}

module.exports = route;