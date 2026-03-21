import { readFileSync } from "fs";
import { Socket } from "../../types/Route";
import { rcon } from "../../index";
import { readFile } from "fs/promises";
import fsExist from "../../components/fsExist";

const route: Socket = async (client, args, reply) => {
	try {
		const players = await rcon.send("list");
		console.log(players);
		
		if (!players) {
			reply(200, {
				active: false
			});
			return;
		}
		const icon = await fsExist(`${process.env.SERVER_PATH}/server-icon.png`) ? (await readFile(`${process.env.SERVER_PATH}/server-icon.png`)).toString("base64") : null;
		const serverProperties = await fsExist(`${process.env.SERVER_PATH}/server.properties`) ? (await readFile(`${process.env.SERVER_PATH}/server.properties`)).toString() : null;
		const modt = serverProperties ? serverProperties.split("\n").find((line) => line.startsWith("motd=")) : "Can't load the modt";
		
		reply(200, {
			active: true,
			icon: icon,
			modt: modt,
			players: {
				current: players.split(/[^0-9]{1,}/)[1],
				max: players.split(/[^0-9]{1,}/)[2]
			}
		});
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;