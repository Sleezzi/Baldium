import { Socket } from "../../types/Route";
import { rcon } from "../../index";

import { existsSync, readFileSync } from "fs";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			Logs(client.username, "The client attempted to retrieve the list of players but does not have the necessary permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		const path = `${process.env.SERVER_PATH}/usernamecache.json`;
		if (!existsSync(path)) {
			reply(501, "Internal Error");
			return;
		}
		const file: {
			[uuid: string]: string,
		} = JSON.parse(readFileSync(path).toString());

		const players: {
			uuid: string,
			username: string,
			online: boolean
		}[] = Object.entries(file).map(([uuid, username]) => ({ uuid: uuid, username: username, online: false }));

		const onlines = await rcon.send("list uuids");
		const onlinesPlayers = onlines.split(/([a-zA-Z0-9_]{4,16}) \(([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})\)/);

		for (const uuid of 
			onlinesPlayers
			.slice(1, onlinesPlayers.length - 1)
			.filter((_, index) => index & 1)
		) {
			const player = players.find((p) => p.uuid === uuid)
			if (!player) {
				continue;
			}
			player.online = true;
		}

		reply(200, players);
	} catch (err) {
		console.error(err);
	}
}

module.exports = route;