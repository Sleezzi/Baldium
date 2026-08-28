import { Socket } from "@baldium/shared-types/src/Route.js";
import { Subscribe, Unsubscribe } from "../../../components/subscription";
import { checkPermission } from "../../../components/account";
import Logs from "../../../components/logs";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (subscriptionId) {
			await Logs(client.userId, "The client has unsubscribed from the analysis channel", client.ip);
			Unsubscribe(subscriptionId);
			reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.userId,
			"mods",
			60 * 1000 * 5,
			(args) => reply(103, args),
			() => reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe.")
		);
		if (!id) {
			await Logs(client.userId, "The client attempted to subscribe to the analysis channel, but their subscription was not registered.", client.ip);
			reply(502, "Internal error");
			return;
		}
		await Logs(client.userId, "The client subscribed to channel mods", client.ip);
		reply(207, id);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;