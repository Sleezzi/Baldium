import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { Socket } from "../../types/Route";


const route: Socket = async (client, args: null, reply) => {
	try {
		const mods = await queryAsync("SELECT id, name, version FROM mods");
		
		await Logs(client.userId, "The client retrieved the list of mods", client.ip);
		reply(200, mods);
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;