import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import { compare } from "bcrypt";
import Logs from "../../components/logs";
import sendMail from "../../components/sendMail";
import { createHash, createHmac, randomInt } from "crypto";
import generateNewToken from "../../components/generateNewToken";
import domino from "domino";

const doubleAuth = async (username: string, email: string, ) => {
	try {
		const document = domino.createDocument("<html></html>");
		const code = randomInt(0, 1_000_000).toString().padStart(8, "0");
		const hash = createHash("sha256").update(code).digest("hex");
		await queryAsync("DELETE FROM connections WHERE email = ? LIMIT 1", email);
		await queryAsync("INSERT INTO connections (email, code, code_expire_in) VALUES (?, ?, ?)", email, hash, Date.now() / 1000 * 60 * 15);
		
		const content = document.createElement("div");

		const hello = document.createElement("p");
		hello.textContent = `Hi ${username},`;
		content.appendChild(hello);

		const yourcode = document.createElement("p");
		yourcode.textContent = "Your code:";
		content.appendChild(yourcode);

		const codeContainer = document.createElement("div");
		codeContainer.style = "margin:1rem 0;display: flex;justify-content:center;";
		content.appendChild(codeContainer);

		const codeText = document.createElement("span");
		codeText.textContent = `${code.slice(0,4)} ${code.slice(4,8)}`;
		codeText.style = "font-weight: bold;font-size: 1.25rem;background: #CCC;padding: .25rem;border-radius: .25rem;border: 1px solid #AAA;";
		codeContainer.appendChild(codeText);

		const enterInRecovryPage = document.createElement("p");
		enterInRecovryPage.textContent = "Enter this code on the login page to access the dashboard. This code will be active for 15 mins.";
		content.appendChild(enterInRecovryPage);

		const dontShare = document.createElement("p");
		dontShare.innerHTML = "Do <b>not</b> share it. We will never contact you to ask for it.";
		content.appendChild(dontShare);

		const footer = document.createElement("p");
		footer.innerHTML = "You are receiving this email because you attempted to log in from a device that is not on your list of authorized devices.<br/><br/>If you have already logged in from this device, it may have been removed from the list of authorized devices. This usually happens when you change your password or if it has been a long time since you last logged in to this device.<br/><br/>If you did not initiate this login, you can ignore this email.";
		content.appendChild(footer);

		await sendMail(email, "Connecting from a new device", content);
		
		setTimeout(() => {
			queryAsync("DELETE FROM connections WHERE email = ?", email);
		}, 1000 * 60 * 15);
	} catch (err) {
		console.error(err);
	}
}

const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const body: {
				id: string,
				password: string,
			} = request.body;
			if (!body) {
				await Logs(null, "The client attempted to connect but did not provide a body in their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.id || typeof body.id !== "string") {
				await Logs(null, "The client attempted to log in but did not provide a username/email in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.password || typeof body.password !== "string") {
				await Logs(null, "The client attempted to log in but did not provide a password in the body of their request", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
			}
			const hashs: { id: number, username: string, email: string, hash: string }[] = await queryAsync("SELECT id, username, email, hash FROM accounts WHERE username = ? OR email = ?", body.id.toLowerCase(), body.id.toLowerCase()) as any;
			if (hashs.length === 0) {
				await Logs(null, "The client attempted to log in, but their account was not found in the database", request.ip);
				response.status(401).json({
					status: 401,
					response: "This accounts doesn't not exist"
				});
				return;
			}
			
			const isValid = await compare(body.password, hashs[0].hash);
			if (!isValid) {
				await Logs(hashs[0].id, "The client attempted to log in, but the password they provided is not the same as the one in the database", request.ip);
				response.status(403).json({
					status: 403,
					response: "Invalid password"
				});
				return;
			}

			const ips = await queryAsync(
				"SELECT * FROM user_ip WHERE userId = ? AND ip_hash = ? LIMIT 1",
				hashs[0].id,
				createHmac("sha256", process.env.SECRET_KEY!).update(request.ip).digest("hex"),
			);
			if (ips.length === 0) {
				await Logs(hashs[0].id, "The handcheck with this client and server failed because the client connected from a new IP address.", request.ip);
				response.status(403).json({
					status: 403,
					response: "You tried to connect using a new IP address."
				});
				await doubleAuth(hashs[0].username, hashs[0].email);
				return;
			}
			
			const token = generateNewToken(hashs[0].id);
			await Logs(hashs[0].id, "The client logged in and was provided with a token", request.ip);
			
			await queryAsync(
				"UPDATE user_ip SET last_connection = ? WHERE userId = ? AND ip_hash = ? LIMIT 1",
				Date.now() / 1000,
				hashs[0].id,
				createHmac("sha256", process.env.SECRET_KEY!).update(request.ip).digest("hex")
			);
			
			response.json({
				status: 200,
				response: token
			});
		} catch (err) {
			console.error(err);
			response.status(500).json({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;