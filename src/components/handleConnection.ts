import Message from "../types/Message";
import { decode, verify } from "jsonwebtoken";
import Logs from "./logs";
import queryAsync from "./queryAsync";
import { connections as activeConnections } from "../index";
import { Ips } from "../types/Accounts";
import { timingSafeEqual, createHash, createHmac } from "crypto";
import { listUserPermissions } from "./permissions";

async function handleConnection(
	message: Message & { ip: string },
	reply: (code: number, response: any) => void,
	close: () => void,
	sendMessage: (message: any, service: string, object: string) => void
): Promise<string | void> {
	const tokenPlayload = decode(message.args);
	
	if (!tokenPlayload || typeof tokenPlayload !== "object") {
		Logs("rejection", "The handshake with the client failed because the server was unable to decode the token provided by the client.", message.ip);
		reply(401, "We are unable to properly authenticate the user because the token's playload is not readable");
		close();
		return;
	}
	if (!("username" in tokenPlayload) || typeof tokenPlayload.username !== "string" || tokenPlayload.username.includes("/")) {
		Logs("rejection", "The handcheck with this client and server failed because the client provided an invalid token.", message.ip);
		reply(401, "We are unable to properly authenticate the user because the username is missing from the token's playload");
		close();
		return;
	}
	const isValid = verify(message.args, process.env.SECRET_KEY || "");
	if (!isValid) {
		Logs("rejection", "The handcheck with this client and server failed because the client provided an invalid token.", message.ip);
		reply(401, "Invalid token");
		close();
		return;
	}
	const username = tokenPlayload.username.toLowerCase();

	const ips = await queryAsync(
		"SELECT * FROM user_ip WHERE username = ? AND ip_hash = ? LIMIT 1",
		username,
		createHmac("sha256", process.env.SECRET_KEY!).update(message.ip).digest("hex"),
	);
	if (ips.length === 0) {
		Logs(tokenPlayload.username, "The handcheck with this client and server failed because the client connected from a new IP address.", message.ip);
		reply(403, "You tried to connect using a new IP address.");
		close();
		return;
	}

	const permissions: { username: string, permissions: number }[] = await queryAsync("SELECT permissions FROM accounts WHERE username = ?", username) as any;
	if (permissions.length === 0) {
		Logs(tokenPlayload.username, "The handcheck with this client and server failed because the client provided an invalid token.", message.ip);
		reply(401, "Invalid token");
		close();
		return;
	}
	if ("username" in permissions[0]) {
		delete (permissions[0] as any).username;
	}
	if (activeConnections.has(username)) { // Checks if the user has already connected to the server
		activeConnections.get(username)!.close(); // Disconnect the user's old connection
	}
	activeConnections.set(username, {
		send: (service, target, message) => {
			sendMessage(message, service, target);
		},
		close: () => {
			sendMessage("client", "disconnection", "You logged in from another location");
			close();
		},
		permissions: permissions[0].permissions
	});
	reply(200, {
			username: username,
			permissions: listUserPermissions(permissions[0].permissions)
		}
	);
	Logs(username, "The client has logged in.", message.ip);
	return username;
}

export default handleConnection;