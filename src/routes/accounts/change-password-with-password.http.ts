import { Socket } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { compare, genSalt, hash } from "bcrypt";
import Logs from "../../components/logs";
import connections from "../../components/connections";

const route: Socket = async (client, args: { current: string, new: string }, reply) => {
	try {
		if (!args) {
			Logs(client.username, "The client attempted to change their password but did not provide any content in the message", client.ip);
			reply(400, "Missing the current password");
			return;
		}
		
		if (!args.current || typeof args.current !== "string") {
			Logs(client.username, "The client attempted to change their password but did not provide any content in the message", client.ip);
			reply(400,"Invalid current password");
			return;
		}
		if (!args.new || typeof args.new !== "string") {
			reply(400,"Invalid current password");
			return;
		}
		const hashs: {hash: string}[] = await queryAsync("SELECT hash FROM accounts WHERE username = ?", client.username.toLowerCase()) as any;
		if (hashs.length === 0) {
			Logs(client.username, "The client tried to change their password but their account could not be found in the database", client.ip);
			reply(502, "The server can't find your account");
			return;
		}
		
		const isValid = await compare(args.current, hashs[0].hash);
		
		if (!isValid) {
			Logs(client.username, "The client tried to change their password, but the password they provided is not the same as the one in the database", client.ip);
			reply(403, "Invalid password");
			return;
		}

		const salt = await genSalt();
		
		Logs(client.username, "The client changed their password", client.ip);
		const hashedPassword = await hash(args.new, salt);
		
		await queryAsync("UPDATE accounts SET hash = ?  WHERE username = ?", hashedPassword, client.username.toLowerCase());
		await queryAsync("UPDATE connections SET ips = [], code = NULL, code_expire_in = NULL WHERE username = ?", client.username.toLowerCase());
		reply(200, "Password edited");
		connections.get(client.username)!.close();
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;