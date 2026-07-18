import { Socket } from "../../../types/Route";
import rcon from "../../components/rcon";
import { checkPermission } from "../../components/account";

const route: Socket = async (client, args, reply) => {
	try {
		if (checkPermission("server", client.permissions)) {
			reply(403, "You can't access to this ressource");
			return;
		}
		const response = await rcon.send("reload");
		
		reply(200, response);
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;