import { HTTP } from "../../types/Route";
import queryAsync from "../../components/queryAsync";

import Logs from "../../components/logs";
import sendMail from "../../components/sendMail";

import { createHash, randomInt } from "crypto";
import domino from "domino";

const createContent = (username: string, code: string): HTMLElement => {
	const document = domino.createDocument("<html></html>");
	const content = document.createElement("div");

	const hello = document.createElement("p");
	hello.innerText = `Hi ${username},`;
	content.appendChild(hello);

	const yourcode = document.createElement("p");
	yourcode.innerText = "Your code:";
	content.appendChild(yourcode);

	const codeContainer = document.createElement("div");
	codeContainer.style = "margin:1rem 0;display: flex;justify-content:center;";
	content.appendChild(codeContainer);

	const codeText = document.createElement("span");
	codeText.innerText = code;
	codeText.style = "font-weight: bold;font-size: 1.25rem;background: #CCC;padding: .25rem;border-radius: .25rem;border: 1px solid #AAA;";
	codeContainer.appendChild(codeText);

	const enterInRecovryPage = document.createElement("p");
	enterInRecovryPage.innerText = "Enter it on the recovery page to change your password. This code will be active for 15 mins.";
	content.appendChild(enterInRecovryPage);

	const dontShare = document.createElement("p");
	dontShare.innerHTML = "Do <b>not</b> share it. We will never contact you to ask for it.";
	content.appendChild(dontShare);

	const footer = document.createElement("p");
	footer.innerText = "You have received this email; we received a password change request. If you did not initiate this request, you can ignore it.";
	content.appendChild(footer);

	return content;
}

const route: HTTP = {
	method: "POST",
	execute: async (request, response) => {
		try {
			const body: string = request.body;
			if (!body || typeof body !== "string") {
				Logs("rejection", "The client attempted to reset their password but did not provide an email address.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid request"
				});
				return;
			}
			if (!body.toLowerCase().match(/[a-z0-9\.-]{1,}@[a-z0-9\.-]{1,}\.[a-z]{2,5}/)) {
				Logs("rejection", "The client attempted to reset their password, but the email address they provided is invalid.", request.ip);
				response.status(400).json({
					status: 400,
					response: "Invalid username"
				});
				return;
			}
			if (!process.env.SECRET_KEY) {
				response.status(500).json({
					status: 500,
					response: "Internal error"
				});
				return;
			}
			const accounts: {username: string}[] = await queryAsync("SELECT username FROM accounts WHERE email = ?", body.toLowerCase());
			if (accounts.length > 0) {
				const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
				const hash = createHash("sha256").update(code).digest("hex");
				await queryAsync("INSERT INTO recovry (email, code, expireAt) VALUES (?, ?, ?)", body.toLowerCase(), hash, new Date(Date.now() / 1000 + 1000 * 60 * 15).valueOf());
				await sendMail(body.toLowerCase(), "Reset password", createContent(accounts[0].username, code));
				Logs(accounts[0].username, "The client has reset their password.", request.ip);
			} else {
				Logs("rejection", "The client tried to reset their password, but their account does not exist.", request.ip);
			}
			
			response.json({
				status: 200,
				response: "E-mail sended"
			});
			setTimeout(async () => {
				try {
					await queryAsync("DELETE FROM recovry WHERE email = ?", body.toLowerCase());
				} catch (error) {}
			}, 1000 * 60 * 15);
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