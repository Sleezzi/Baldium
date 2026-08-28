import { Socket } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../components/queryAsync";
import Logs from "../../components/logs";
import { checkPermission } from "../../components/account";
import connections from "../../components/connections";
import { Trigger } from "../../components/subscription";

const route: Socket = async (client, args: { user: number, permissions: number }, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to view the list of accounts but does not have sufficient permissions to", client.ip);
			reply(403, "You can't access to this");
			return;
		}
		if (typeof args !== "object") {
			await Logs(client.userId, "The client attempted to modify the permissions but did not provide a args.", client.ip);
			reply(400, "Invalid request");
			return;
		}
		if (!("user" in args) || typeof args.user !== "number") {
			await Logs(client.userId, "The client attempted to modify the permissions but did not provide a valid ID.", client.ip);
			reply(400, "Invalid user id");
			return;
		}
		if (!("permissions" in args) || typeof args.permissions !== "number") {
			await Logs(client.userId, `The client attempted to modify the permissions of ${args.user} but did not provide a valid permissions.`, client.ip);
			reply(400, "Invalid user id");
			return;
		}
		if (args.user === 1) {
			await Logs(client.userId, "The client attempted to modify the permissions but provid the owner id.", client.ip);
			reply(400, "You can't edit the owner permissions");
			return;
		}
		await queryAsync("UPDATE accounts SET permissions = ? WHERE id = ? LIMIT 1", args.permissions, args.user);
		
		await Logs(client.userId, `The client changed the permissions of ${args.user}'s account`, client.ip);
		Trigger("client", {
			userId: args.user,
			reason: "permissions-updated",
			args: args.permissions
		});
		if (connections.has(args.user)) { // If the client whose permissions were changed is also connected
			const user = connections.get(args.user)!;
			connections.set(args.user, {
				...user,
				permissions: args.permissions
			});
		}
		reply(200, "The permission have been updated");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;