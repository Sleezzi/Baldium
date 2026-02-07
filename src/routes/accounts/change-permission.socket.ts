import connections from "../../components/connections";
import Logs from "../../components/logs";
import checkPermission, { listUserPermissions, permissions } from "../../components/permissions";
import queryAsync from "../../components/queryAsync";
import Account from "../../types/Accounts";
import { Socket } from "../../types/Route";

type Args = {
	username: string,
	permission: keyof typeof permissions,
}

const route: Socket = async (client, args: Args, reply) => {
	try {
		if (!checkPermission("admin", client.permissions) && client.username !== process.env.ADMIN) {
			Logs(client.username, "The client attempted to change the permissions of an account but does not have sufficient permissions to perform the action", client.ip);
			reply(403, "You can't edit account permissions");
			return;
		}
		if (!args.username || typeof args.username !== "string" ||
			!args.permission || typeof args.permission !== "string" || !(args.permission in permissions)
		) {
			Logs(client.username, "The client attempted to change account permissions but did not provide the correct information in the message", client.ip);
			reply(400, "Invalid args");
			return;
		}

		if (args.username.toLowerCase() === process.env.ADMIN && client.username !== process.env.ADMIN) {
			Logs(client.username, "The client attempted to change the permissions of an administrator account", client.ip);
			reply(403, "This account is a super admin and can't be edited");
			return;
		}
		if (args.permission.toLowerCase() === "admin" && client.username !== process.env.ADMIN) {
			Logs(client.username, "The client attempted to change account permissions but did not provide the correct information in the message", client.ip);
			reply(400, "Invalid args");
			return;
		}
		const account: Account[] = await queryAsync("SELECT * FROM accounts WHERE username = ?", args.username.toLowerCase());
		if (account.length === 0) {
			Logs(client.username, `The client attempted to change the permissions of ${args.username}'s account, but the account does not exist`, client.ip);
			reply(404, "This account didn't exist");
			return;
		}
		const newPermission = checkPermission(args.permission, account[0].permissions) ? account[0].permissions - permissions[args.permission] : account[0].permissions + permissions[args.permission]
		
		await queryAsync(`UPDATE account SET permissions = ? WHERE username = ?`, newPermission, args.username.toLowerCase());

		Logs(client.username, `The client changed the permissions of ${args.username}'s account`, client.ip);
		if (connections.has(args.username.toLowerCase())) { // If the client whose permissions were changed is also connected
			const user = connections.get(args.username.toLowerCase())!
			connections.set(args.username.toLowerCase(), {
				...user,
				permissions: newPermission
			}); // Disconnect the user
			user.send({
				permission: args.permission,
				state: listUserPermissions(newPermission)
			}, "client", "permission");
		}
		reply(200, "The permission have been updated");
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;