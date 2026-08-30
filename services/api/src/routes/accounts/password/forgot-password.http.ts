import { HTTP } from "@baldium/shared-types/src/Route.js";
import queryAsync from "../../../components/queryAsync";

import Logs from "../../../components/logs";
import sendMail from "../../../components/sendMail";

import { createHash, createHmac, randomInt } from "crypto";
// import domino from "domino";

// const createContent = (username: string, code: string): HTMLElement => {
// 	const document = domino.createDocument("<html></html>");
// 	const content = document.createElement("div");

// 	const hello = document.createElement("p");
// 	hello.textContent = `Hi ${username},`;
// 	content.appendChild(hello);

// 	const yourcode = document.createElement("p");
// 	yourcode.textContent = "Your code:";
// 	content.appendChild(yourcode);

// 	const codeContainer = document.createElement("div");
// 	codeContainer.style = "margin:1rem 0;display: flex;justify-content:center;";
// 	content.appendChild(codeContainer);

// 	const codeText = document.createElement("span");
// 	codeText.textContent = code;
// 	codeText.style = "font-weight: bold;font-size: 1.25rem;background: #CCC;padding: .25rem;border-radius: .25rem;border: 1px solid #AAA;";
// 	codeContainer.appendChild(codeText);

// 	const enterInrecoveryPage = document.createElement("p");
// 	enterInrecoveryPage.textContent = "Enter it on the recovery page to change your password. This code will be active for 15 mins.";
// 	content.appendChild(enterInrecoveryPage);

// 	const dontShare = document.createElement("p");
// 	dontShare.innerHTML = "Do <b>not</b> share it. We will never contact you to ask for it.";
// 	content.appendChild(dontShare);

// 	const footer = document.createElement("p");
// 	footer.textContent = "You have received this email; we received a password change request. If you did not initiate this request, you can ignore it.";
// 	content.appendChild(footer);

// 	return content;
// }

const route: HTTP<{
	Body: string
}> = {
	method: "POST",
	schema: {
		body: {
			type: "string",
		}
	},
	prehandler: async (request, response, done) => {
		const body = request.body;
		if (!body.toLowerCase().match(/[a-z0-9\.-]{1,}@[a-z0-9\.-]{1,}\.[a-z]{2,5}/)) {
			await Logs(null, "The client attempted to reset their password, but the email address they provided is invalid.", request.clientIP);
			return response.status(400).send({
				status: 400,
				response: "Invalid email"
			});
		}
	},
	handler: async (request, response) => {
		try {
			const body = request.body;

			const email_hash = createHmac("sha256", process.env.LOW_SECRET_KEY!)
						.update(body.trim().toLowerCase())
						.digest("hex");

			const accounts: { username: string, id: number }[] = await queryAsync("SELECT username, id FROM accounts WHERE email_hash = ? LIMIT 1", email_hash);
			if (accounts.length > 0) {
				const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
				const hash = createHash("sha256").update(code).digest("hex");

				await queryAsync("INSERT INTO recovery (email, code, expireAt) VALUES (?, ?, ?)", email_hash, hash, Math.floor((Date.now() + 1000 * 60 * 15) / 1000));
				// await sendMail(body.toLowerCase(), "Reset password", createContent(accounts[0].username, code));
				await Logs(accounts[0].id, "The client has reset their password.", request.clientIP);
			} else {
				await Logs(null, "The client tried to reset their password, but their account does not exist.", request.clientIP);
			}
			setTimeout(async () => {
				try {
					await queryAsync("DELETE FROM recovery WHERE email = ? LIMIT 1", email_hash);
				} catch (error) {}
			}, 1000 * 60 * 15);
			
			return response.send({
				status: 200,
				response: "E-mail sended"
			});
		} catch (err) {
			console.error(err);
			return response.status(500).send({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;