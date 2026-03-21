import { Socket } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { compare, genSalt, hash } from "bcrypt";
import Logs from "../../components/logs";
import connections from "../../components/connections";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: { current: string, new: string }, reply) => {
	try {
		if (!args) {
			await Logs(client.userId, "The client attempted to change their password but did not provide any content in the message", client.ip);
			reply(400, "Missing the current password");
			return;
		}
		
		if (!args.current || typeof args.current !== "string") {
			await Logs(client.userId, "The client attempted to change their password but did not provide any content in the message", client.ip);
			reply(400,"Invalid current password");
			return;
		}
		if (!args.new || typeof args.new !== "string") {
			reply(400,"Invalid current password");
			return;
		}
		const hashs: {hash: string}[] = await queryAsync("SELECT hash FROM accounts WHERE id = ?", client.userId) as any;
		if (hashs.length === 0) {
			await Logs(client.userId, "The client tried to change their password but their account could not be found in the database", client.ip);
			reply(502, "The server can't find your account");
			return;
		}
		
		const isValid = await compare(args.current, hashs[0].hash);
		
		if (!isValid) {
			await Logs(client.userId, "The client tried to change their password, but the password they provided is not the same as the one in the database", client.ip);
			reply(403, "Invalid password");
			return;
		}

		const salt = await genSalt();
		
		await Logs(client.userId, "The client changed their password", client.ip);
		const hashedPassword = await hash(args.new, salt);
		
		await queryAsync("UPDATE accounts SET hash = ?  WHERE id = ?", hashedPassword, client.userId);
		await queryAsync("UPDATE connections SET ips = [], code = NULL, code_expire_in = NULL WHERE userId = ?", client.userId);
		await queryAsync("DELETE FROM user_ip WHERE userId = ?", client.userId);
		reply(200, "Password edited");
		Trigger("client", {
			userId: client.userId,
			reason: "password-updated",
		});
		connections.get(client.userId)!.close();
	} catch (err) {
		console.error(err);
		reply(502, "Internal error");
	}
}

module.exports = route;