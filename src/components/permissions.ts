function checkPermission(min_permission: keyof typeof permissions, current_permission: number): boolean {
	if (!(min_permission in permissions)) return false;
	if ((current_permission & permissions.admin) !== 0) return true;
	return (current_permission & permissions[min_permission]) !== 0;
}
/** For more information see https://wiki.sleezzi.fr/baldium/account/permissions */
export const permissions = {
	/** Grants all permissions to the user */
	admin: 1 << 0,
	/** Must have mods or manage_files privileges to manage mods */
	get mods () {
		return 1 << 1 || permissions.manage_files;
	},
	/** Must have read_files or manage_files privileges to access the files */
	get read_files () {
		return 1 << 2 || permissions.manage_files;
	},
	/** Must have manage_files privileges to manage the file */
	manage_files: 1 << 3,
	/** Must have read_console or write_console privileges to access the console */
	get read_console () {
		return 1 << 4 || permissions.write_console;
	},
	/** Must have write_console privileges to write in the console */
	write_console: 1 << 5,
	/** Must have read_log or manage_log privileges to access the logs */
	get read_log () {
		return 1 << 6 || permissions.manage_log;
	},
	/** Must have manage_log privileges to manage the logs */
	get manage_log () {
		return 1 << 7;
	},
	/** You must have server or write_console privileges to access and control the Minecraft server (monitoring, restarting, etc.). */
	get server () {
		return 1 << 8 || permissions.write_console;
	},
	/** You must have player or write_console privileges to control players (ban, kill, inventory clear...). */
	get players () {
		return 1 << 9 || permissions.write_console;
	},
}

export function listUserPermissions(userPermissions: number) {
	const list: (keyof typeof permissions)[] = [];
	for (const permission of (Object.keys(permissions) as (keyof typeof permissions)[])) {
		if (!checkPermission(permission, userPermissions)) continue;
		list.push(permission);
	}
	return list;
}

export default checkPermission;