import { decode, verify, sign } from "jsonwebtoken";
import queryAsync from "./queryAsync";

type AuthenticationResult = {
	success: false,
	message: string
} | {
	success: true,
	message: number,
}

function checkToken(token: string) {
	try {
		// The "admin" bit grants access to absolutely everything, regardless of min_permission. 
		// Note: `permissions` must remain a frozen object where `admin` is always a valid bit (1 << 0). 
		// If `permissions.admin` were ever to become `undefined`, JS would treat it as `0` in the
		// bitwise operation below without throwing an error—the admin bypass would fail silently.
		verify(token, process.env.SECRET_KEY!, { algorithms: ["HS256"] });
		return true;
	} catch (error) {
		return false;
	}
}

export async function authenticate(token: string): Promise<AuthenticationResult> {
	try {
		if (!checkToken(token)) {
			return {
				success: false,
				message: "INVALID_TOKEN"
			};
		}
		const data = decode(token); // Decode the token to obtain the playload. The playload must contain the client's userid
		
		if (!data) { // Check if the userid is present in the playload. If it is not, it means the server signed a token without including a playload.
			return {
				success: false,
				message: "MISSING_PAYLOAD"
			};
		}
		const payload: { userId: number, version: string } = typeof data === "string" ? JSON.parse(data) : data;
		if (!payload) {
			return {
				success: false,
				message: "INVALID_PAYLOAD"
			}
		}
		if (!("userId" in payload)) {
			return {
				success: false,
				message: "INVALID_USERID"
			}
		}
		if (!("version" in payload)) {
			return {
				success: false,
				message: "INVALID_VERSION"
			}
		}
		const version: { version: string, id: number }[] = await queryAsync("SELECT version FROM accounts WHERE id = ?", payload.userId);
		if (version.length === 0) return {
			success: false,
			message: "INVALID_USERID"
		}
		if (version[0].version !== payload.version) return {
			success: false,
			message: "INVALID_VERSION"
		}

		return {
			success: true,
			message: payload.userId
		}
	} catch (err) {
		console.error(err);
		return {
			success: false,
			message: "INTERNAL_ERROR"
		}
	}
}

export function generateToken(userId: number, version: string) {
	if (!process.env.SECRET_KEY) {
		throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
	}
	return sign({ userId: userId, version: version }, process.env.SECRET_KEY, { expiresIn: 2629743 });
}

export function checkPermission(min_permission: keyof typeof permissions, current_permission: number): boolean {
	try {
		if (!(min_permission in permissions)) return false;
		if ((current_permission & permissions.admin) !== 0) return true;
		return (current_permission & permissions[min_permission]) !== 0;
	} catch (err) {
		console.error(err);
		return false;
	}
}

/** For more information see https://wiki.sleezzi.fr/baldium/account/permissions */
export const permissions = Object.freeze({
	/** Grants all permissions to the user */
	admin: 1 << 0,
	/** Must have mods or manage_files privileges to manage mods */
	get mods() {
		return 1 << 1 | this.manage_files;
	},
	/** Must have read_files or manage_files privileges to access the files */
	get read_files() {
		return 1 << 2 | this.manage_files;
	},
	/** Must have manage_files privileges to manage the file */
	manage_files: 1 << 3,
	/** Must have read_console or write_console privileges to access the console */
	get read_console() {
		return 1 << 4 | this.write_console;
	},
	/** Must have write_console privileges to write in the console */
	write_console: 1 << 5,
	/** You must have server or write_console privileges to access and control the Minecraft server (monitoring, restarting, etc.). */
	get server() {
		return 1 << 6 | this.write_console;
	},
	/** You must have player or write_console privileges to control players (ban, kill, inventory clear...). */
	get players() {
		return 1 << 7 | this.write_console;
	},
});

export function listUserPermissions(userPermissions: number) {
	const list: (keyof typeof permissions)[] = [];
	for (const permission of (Object.keys(permissions) as (keyof typeof permissions)[])) {
		if (!checkPermission(permission, userPermissions)) continue;
		list.push(permission);
	}
	return list;
}