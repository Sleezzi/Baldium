// import domino from "domino";
import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "@baldium/shared-types/src/Route.js";
import sendMail from "../../components/sendMail";
import connections from "../../components/connections";
import { decipher } from "../../components/crypt";


const route: Socket = async (client, args, reply) => {
	try {
		const accounts: { email: string, username: string }[] = await queryAsync("SELECT email, username FROM accounts WHERE id = ? LIMIT 1", client.userId);
		if (accounts.length === 0) {
			reply(404, "You requested account deletion, but your account information is not available. Therefore, your account has not been deleted.");
			await Logs(client.userId, "The client requested the deletion of their account, but their account information is not available.", client.ip);
			return;
		}
		const account = accounts[0];

		// const document = domino.createDocument("<html></html>");
		// const content = document.createElement("div");

		// const hello = document.createElement("p");
		// hello.textContent = `Hi ${account.username},`;
		// content.appendChild(hello);

		// const text = document.createElement("p");
		// text.textContent = "We are sending you this email to confirm that your account has been successfully deleted.";
		// content.appendChild(text);

		// const footer = document.createElement("p");
		// footer.textContent = "We are sorry to lose you. If this deletion is due to a problem, please let us know at contact@sleezzi.fr";
		// content.appendChild(footer);
		
		// await sendMail(decipher(account.email), "Deleting your account", content);


		await queryAsync("DELETE FROM accounts WHERE id = ? LIMIT 1", client.userId);

		reply(200, "Success");
		connections.delete(client.userId);
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;