import { Socket } from "@baldium/shared-types/src/Route.js";
import * as docker from "../../components//docker";

const route: Socket = async (client, args, reply) => {
	try {
		const isActive = await docker.sendAction("Status");
		
		reply(200, {
			active: !!isActive,
			name: process.env.MINECRAFT_NAME,
			version: process.env.VERSION,
			modloader: process.env.MODLOADER,
			ip: process.env.MINECRAFT_DOMAIN
		});
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;