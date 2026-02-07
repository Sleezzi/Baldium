import { Socket } from "../../types/Route";
import { Subscribe, Unsubscribe } from "../../components/subscription";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, subscriptionId: string, reply) => {
	try {
		if (!checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		if (subscriptionId) {
			Unsubscribe(subscriptionId);
			reply(200, "Removed");
			return;
		}
		const id = Subscribe(
			client.username,
			"server_analysis",
			60 * 1000 * 5,
			(stats) => reply(103, stats),
			() => reply(200, "Your subscription has expired. You will no longer receive messages from this server regarding this event unless you resubscribe.")
		);
		if (id.length === 0) {
			reply(502, "Internal error");
			return;
		}
		reply(207, id);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;