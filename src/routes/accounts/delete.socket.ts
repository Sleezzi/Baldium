import domino from "domino";
import Logs from "../../components/logs";
import queryAsync from "../../components/queryAsync";
import { Socket } from "../../types/Route";
import sendMail from "../../components/sendMail";
import connections from "../../components/connections";


const route: Socket = async (client, args, reply) => {
	try {
		const accounts: { email: string }[] = await queryAsync("SELECT email FROM account WHERE username = ?", client.username);
		if (accounts.length === 0) {
			reply(404, "You requested account deletion, but your account information is not available. Therefore, your account has not been deleted.");
			Logs(client.username, "The customer requested the deletion of their account, but their account information is not available.", client.ip);
			return;
		}
		const document = domino.createDocument("<html></html>");
		const content = document.createElement("div");

		const hello = document.createElement("p");
		hello.innerText = `Hi ${client.username},`;
		content.appendChild(hello);

		const text = document.createElement("p");
		text.innerText = "We are sending you this email to confirm that your account has been successfully deleted.";
		content.appendChild(text);

		const footer = document.createElement("p");
		footer.innerHTML = "We are sorry to lose you. If this deletion is due to a problem, please let us know at contact@sleezzi.fr";
		content.appendChild(footer);

		sendMail(accounts[0].email, "Deleting your account", content);
		await queryAsync("DELETE FROM accounts WHERE username = ? LIMIT 1", client.username);
		reply(200, "Success");
		connections.delete(client.username);
	} catch (err) {
		console.error(err);
		reply(500, "Internal error");
	}
}

module.exports = route;