import { existsSync, readFileSync } from "fs";
import { Socket } from "../../types/Route";
import { ungzip } from "pako";
import * as pnbt from "prismarine-nbt";
import * as nbtTS from "nbt-ts";

import { rcon } from "../../index";
import simplifySNBT from "../../components/simplifySNBT";
import Logs from "../../components/logs";
import checkPermission from "../../components/permissions";

type RawItem = {
	count: number,
	Slot: number,
	id: string,
	components?: {
		[component: string]: any
	}
}

type PlayerData = {
	equipment: {
		head: RawItem | null,
		chest: RawItem | null,
		legs: RawItem | null,
		feet: RawItem | null,
		offhand: RawItem | null,
	},
	Inventory: RawItem[],
	Dimension: string,
	EnderItems: RawItem[],
	Tags?: string[],
	Health: number,
	foodLevel: number,
	LastDeathLocation?: {
		dimension: string,
		pos: number[]
	},
	XpLevel: number,
	XpP: number,
	active_effects?: {
		id: string,
		duration: number,
		amplifier: string
	}[]
}

const getPlayerDataFromGame = async (username: string): Promise<PlayerData | { code: number, message: string }> => {
	try {
		const datasToFetch = [
			"Dimension",
			"Tags",
			"Health",
			"foodLevel",
			"LastDeathLocation",
			"XpLevel",
			"XpP",
			"active_effects"
		]
		const fetchedData: any = {
			Inventory: [],
			EnderItems: [],
			equipment: {}
		};

		for (const data of datasToFetch) {
			const rawData = await rcon.send(`data get entity ${username} ${data}`);
			if (rawData === "No entity was found") {
				break;
			}
			if (rawData.startsWith(`Found no elements matching `)) {
				continue;
			}
			const parsedData: any = nbtTS.parse(rawData.split(username)[1].slice(" has the following entity data: ".length));
			const value = simplifySNBT(parsedData);
			fetchedData[data] = value;
		}

		for (const part of ["head","chest","legs","feet","offhand"]) {
			const rawData = await rcon.send(`data get entity ${username} equipment.${part}`);
			if (rawData === "No entity was found") {
				break;
			}
			if (rawData.startsWith(`Found no elements matching`)) {
				fetchedData[part] = null;
				continue;
			}
			
			try {
				const parsedData: any = nbtTS.parse(rawData.split(username)[1].slice(" has the following entity data: ".length));
				const value = simplifySNBT(parsedData);
				fetchedData.equipment[part] = value;
			} catch (err) {
				const itemName = (await rcon.send(`data get entity ${username} equipment.${part}.id`)).split(username)[1].slice(" has the following entity data: ".length)
				fetchedData.equipment[part] = {
					count: 1,
					id: itemName,
					components: {
						"custom:error": "Unable to retrieve data corresponding to this item"
					}
				};
			}
		}

		for (let index = 0; index < 40; index++) {
			const rawData = await rcon.send(`data get entity ${username} Inventory[${index}]`);
			if (rawData === "No entity was found") {
				break;
			}
			if (rawData === `Found no elements matching Inventory[${index}]\n`) {
				continue;
			}
			
			try {
				const parsedData: any = nbtTS.parse(rawData.split(username)[1].slice(" has the following entity data: ".length));
				const value = simplifySNBT(parsedData);
				fetchedData.Inventory.push(value);
			} catch (err) {
				const itemName = (await rcon.send(`data get entity ${username} Inventory[${index}].id`)).split(username)[1].slice(" has the following entity data: ".length)
				fetchedData.Inventory.push({
					count: 1,
					Slot: index,
					id: itemName,
					components: {
						"custom:error": "Unable to retrieve data corresponding to this item"
					}
				});
			}
		}

		for (let index = 0; index < 27; index++) {
			const rawData = await rcon.send(`data get entity ${username} EnderItems[${index}]`);
			if (rawData === "No entity was found") {
				break;
			}
			if (rawData === `Found no elements matching EnderItems[${index}]\n`) {
				continue;
			}
			try {
				const parsedData: any = nbtTS.parse(rawData.split(username)[1].slice(" has the following entity data: ".length));
				const value = simplifySNBT(parsedData);
				fetchedData.EnderItems.push(value);
			} catch (err) {
				const itemName = (await rcon.send(`data get entity ${username} EnderItems[${index}].id`)).split(username)[1].slice(" has the following entity data: ".length)
				fetchedData.EnderItems.push({
					count: 1,
					Slot: index,
					id: itemName,
					components: {
						"custom:error": "Unable to retrieve data corresponding to this item"
					}
				});
			}
		}

		return fetchedData;
	} catch (err) {
		console.error(err);
		return {
			code: 502,
			message: "Internal Error"
		};
	}
}
const getPlayerDataFromFile = async (uuid: string): Promise<PlayerData | { code: number, message: string }> => {
	try {
		const path = `${process.env.SERVER_PATH}/world/playerdata/${uuid}.dat`;
		if (!existsSync(path)) {
			return { code: 404, message: "Player not found" };
		}
		const playerDataCompressed = readFileSync(path);
		if (!playerDataCompressed) {
			return { code: 500, message: "The server can't read the player's data" };
		}
		
		const playerDataUncompressed = ungzip(playerDataCompressed);
		const buffer = Buffer.from(playerDataUncompressed);
		const { parsed } = await pnbt.parse(buffer);
		const value = pnbt.simplify(parsed) || parsed.value;

		if (!value) {
			return { code: 502, message: "Internal Error" };
		}

		return value;
	} catch (err) {
		console.error(err);
		return { code: 502, message: "Internal Error" };
	}
}

const route: Socket = async (client, args: string, reply) => {
	try {
		if (!checkPermission("players", client.permissions)) {
			Logs(client.username, "The client attempted to access a player's information but does not have permission to", client.ip);
			reply(403, "You can't access to this ressource");
			return;
		}
		if (!args) {
			Logs(client.username, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player id");
			return;
		}
		if (typeof args !== "string") {
			Logs(client.username, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(400, "Invalid player id");
			return;
		}
		const onlines = await rcon.send("list uuids");
		const onlinesPlayers = onlines.split(/([a-zA-Z0-9_]{4,16}) \(([0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12})\)/);
		
		const isOnline = onlinesPlayers.find((player) => player === args);
		if (isOnline) {
			const username = onlinesPlayers.find((_player, i) => onlinesPlayers[i + 1] === args);
			
			if (!username) {
				Logs(client.username, "The client attempted to access a player's information, but the server encountered an error.", client.ip);
				reply(502, "Internal Error");
				return;
			}
			const value = await getPlayerDataFromGame(username);
			if ("code" in value && "message" in value) {
				Logs(client.username, "The client attempted to access a player's information, but the server encountered an error.", client.ip);
				reply(502, "Internal Error");
				return;
			}
			Logs(client.username, `The client attempted to access player information "${username}"`, client.ip);
			
			reply(200, {
				username: username,
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
				online: true,
				effects: value.active_effects ? value.active_effects.map((effect: { id: string, duration: number, amplifier: string }) => ({ id: effect.id, duration: effect.duration === -1 ? "infinite" : effect.duration, level: effect.amplifier})) : []
			});
			return;
		}
		
		const value = await getPlayerDataFromFile(args);
		if ("code" in value && "message" in value) {
			reply(value.code, value.message);
			return;
		}

		const path = `${process.env.SERVER_PATH}/usernamecache.json`;
		if (!existsSync(path)) {
			Logs(client.username, "The client attempted to access a player's information, but the server encountered an error.", client.ip);
			reply(501, "Internal Error");
			return;
		}
		const file: {
			[uuid: string]: string,
		} = JSON.parse(readFileSync(path).toString());

		if (!(args in file)) {
			Logs(client.username, "The client attempted to access a player's information but did not provide the data requested by the server", client.ip);
			reply(404, "Player not found");
			return;
		}
		
		Logs(client.username, `The client attempted to access player information "${file[args]}"`, client.ip);
		reply(200, {
			username: file[args],
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
			online: false,
			effects: value.active_effects ? value.active_effects.map((effect: { id: string, duration: number, amplifier: string }) => ({ id: effect.id, duration: effect.duration === -1 ? "infinite" : effect.duration, level: effect.amplifier})) : []
		});
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;