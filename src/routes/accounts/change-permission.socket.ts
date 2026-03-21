import connections from "../../components/connections";
import Logs from "../../components/logs";
import checkPermission, { listUserPermissions, permissions } from "../../components/permissions";
import queryAsync from "../../components/queryAsync";
import { Trigger } from "../../components/subscription";
import Account from "../../types/Accounts";
import { Socket } from "../../types/Route";

type Args = {
	userId: number,
	permission: keyof typeof permissions,
}

const route: Socket = async (client, args: Args, reply) => {
	try {
		if (!checkPermission("admin", client.permissions)) {
			await Logs(client.userId, "The client attempted to change the permissions of an account but does not have sufficient permissions to perform the action", client.ip);
			reply(403, "You can't edit account permissions");
			return;
		}
		if (!args.userId || typeof args.userId !== "string" ||
			!args.permission || typeof args.permission !== "string" || !(args.permission in permissions)
		) {
			await Logs(client.userId, "The client attempted to change account permissions but did not provide the correct information in the message", client.ip);
			reply(400, "Invalid args");
			return;
		}
		if (args.permission.toLowerCase() === "admin") {
			await Logs(client.userId, "The client attempted to change account permissions but did not provide the correct information in the message", client.ip);
			reply(400, "Invalid args");
			return;
		}
		const account: Account[] = await queryAsync("SELECT * FROM accounts WHERE id = ?", args.userId);
		if (account.length === 0) {
			await Logs(client.userId, `The client attempted to change the permissions of ${args.userId}'s account, but the account does not exist`, client.ip);
			reply(404, "This account didn't exist");
			return;
		}
		const newPermission = checkPermission(args.permission, account[0].permissions) ? account[0].permissions - permissions[args.permission] : account[0].permissions + permissions[args.permission]
		
		await queryAsync(`UPDATE accounts SET permissions = ? WHERE id = ?`, newPermission, args.userId);

		await Logs(client.userId, `The client changed the permissions of ${args.userId}'s account`, client.ip);
		Trigger("client", {
			userId: client.userId,
			reason: "permissions-updated",
			args: newPermission
		});
		if (connections.has(args.userId)) { // If the client whose permissions were changed is also connected
			const user = connections.get(args.userId)!;
			connections.set(args.userId, {
				...user,
				permissions: newPermission
			}); // Disconnect the user
		}
		reply(200, "The permission have been updated");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;