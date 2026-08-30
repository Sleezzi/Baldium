import { readFile } from "fs/promises";
import { Socket } from "@baldium/shared-types/src/Route.js";
import { ungzip } from "pako";

import * as pnbt from "prismarine-nbt";

import rcon from "../../components/con";
import Logs from "../../components/ogs";
import { checkPermission } from "../../components/ccount";
import fsExist from "../../components/iles/fsExist";
import { blocklist, isNotTraversal } from "../../components/files/Unauthorized";


const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			await Logs(client.userId, "The client attempted to access a player's information but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			await Logs(client.userId, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player id");
			return;
		}
		if (typeof args !== "string") {
			await Logs(client.userId, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player id");
			return;
		}
		const onlines = await rcon.send("list uuids");
		const onlinesPlayers = onlines.split(/([a-zA-Z0-9_]{4,16}) \(([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})\)/);
		
		const isOnline = onlinesPlayers.find((player) => player === args);
		if (isOnline) {
			await rcon.send("save-all flush");
		}
		
		const playerdata = isNotTraversal(process.env.SERVER_PATH!, "/world/playerdata/", `${args}.dat`);
		if (!playerdata) {
			await Logs(client.userId, "The client attempted to access a player's information but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
			reply(400, "Invalid player id");
			return;
		}
		for (const unauthorized of blocklist) {
			if (typeof unauthorized === "string") {
				if (unauthorized === playerdata) {
					await Logs(client.userId, "The client attempted to access a player's information but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
					reply(400, "Invalid player id");
					return;
				}
			}
			if (playerdata.match(unauthorized)) {
				await Logs(client.userId, "The client attempted to access a player's information but did not provide a valid path to the file\n /!\\ The path was actually a hidden path", client.ip);
				reply(400, "Invalid player id");
				return;
			}
		}
		if (!await fsExist(playerdata)) {
			await Logs(client.userId, "The client attempted to access a player's information but did not provide a valid path to the file", client.ip);
			reply(404, "Player not found");
			return;
		}

		const playerDataCompressed = await readFile(playerdata);
		if (!playerDataCompressed) {
			await Logs(client.userId, "The client attempted to access a player's information but the server can't decompress the file", client.ip);
			reply(500, "The server can't read the player's data");
		}
		
		const playerDataUncompressed = ungzip(playerDataCompressed);
		const buffer = Buffer.from(playerDataUncompressed);
		const { parsed } = await pnbt.parse(buffer);
		const value = pnbt.simplify(parsed) || parsed.value;

		if (!value) {
			await Logs(client.userId, "The client attempted to access a player's information but the server can't read the file", client.ip);
			reply(502, "Internal Error");
			return;
		}

		const path = `${process.env.SERVER_PATH}/usercache.json`;
		if (!await fsExist(path)) {
			await Logs(client.userId, "The client attempted to access a player's information, but the server can't find /usercache.json.", client.ip);
			reply(501, "Internal Error");
			return;
		}
		
		const file: {
			uuid: string,
			name: string,
			expiresOn: string
		}[] = JSON.parse((await readFile(path)).toString());

		const player = file.find((player) => player.uuid === args);

		if (!player) {
			await Logs(client.userId, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(404, "Player not found");
			return;
		}
		
		await Logs(client.userId, `The client attempted to access player information "${player.name}"`, client.ip);
		reply(200, {
			username: player.name,
			inventory: value.Inventory,
			equipments: value.equipment,
			dimension: value.Dimension,
			enderchest: value.EnderItems,
			tags: value.Tags,
			health: value.Health,
			food: value.foodLevel,
			death: value.LastDeathLocation ? {
				dimension: value.LastDeathLocation.dimension,
				position: {
					x: value.LastDeathLocation.pos[0],
					y: value.LastDeathLocation.pos[1],
					z: value.LastDeathLocation.pos[2]
				}
			} : null,
			level: {
				level: value.XpLevel,
				percentage: Math.floor(value.XpP * 100)
			},
			online: isOnline,
			effects: value.active_effects ? value.active_effects.map((effect: { id: string, duration: number, amplifier: string }) => ({ id: effect.id, duration: effect.duration === -1 ? "infinite" : effect.duration, level: effect.amplifier})) : []
		});
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;