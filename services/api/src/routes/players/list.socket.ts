import { Socket } from "@baldium/shared-types/src/Route.js";
import rcon from "../../components//rcon";

import { stat, readFile } from "fs/promises";
import Logs from "../../components//logs";
import { checkPermission } from "../../components//account";
import fsExist from "../../components//files/fsExist";

const route: Socket = async (client, args, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to retrieve the list of players but does not have the necessary permissions.", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		const path = `${process.env.SERVER_PATH}/usercache.json`;
		if (!await fsExist(path)) {
			throw new Error(`Unable to find the file "${process.env.SERVER_PATH}/usernamecache.json"`);
		}
		const file: {
			uuid: string,
			name: string,
			expiresOn: string
		}[] = JSON.parse((await readFile(path)).toString());

		const players: {
			uuid: string,
			username: string,
			online: boolean
		}[] = file.map((player) => ({ uuid: player.uuid, username: player.name, online: false }));

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
		await Logs(client.userId, "The client retrieved the list of players", client.ip);
		reply(200, players);
	} catch (err) {
		reply(501, "Internal Error");
		console.error(err);
	}
}

module.exports = route;