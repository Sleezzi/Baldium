import { mail } from "../index";
import domino from "domino";

const content = (title: string, body: HTMLElement) => {
	const document = domino.createDocument("<html></html>");
	const container = document.createElement("div");
	container.style = "margin: .5rem 2rem;height: calc(100% - .5rem * 2);width: calc(100% - 2rem * 2);background: #EEE";

	const header = document.createElement("header");
	header.style = "width: 100%;border-top: #333 solid .75rem;text-align: center;";
	container.appendChild(header);

	const titleElement = document.createElement("h1");
	titleElement.innerText = title;
	header.appendChild(titleElement);

	const bodyElement = document.createElement("div");
	bodyElement.style = "padding: 0 1rem;";
	bodyElement.appendChild(body);
	container.appendChild(bodyElement);

	const footer = document.createElement("footer");
	footer.style = "width: 100%;display: flex;flex-direction: column;align-items: center;color: #333;margin: 1rem 0;";
	container.appendChild(footer);

	const dontreply = document.createElement("span");
	dontreply.innerText = "This email was sent automatically, please do not reply to it.";
	footer.appendChild(dontreply);

	const right = document.createElement("span");
	right.innerText = "© 2026 Sleezzi Inc - All right reserved";
	footer.appendChild(right);

	return container.innerHTML;
}

const sendMail = (to: string, object: string, body: HTMLElement) => mail.sendMail({
	from: `"${process.env.MAIL_NAME}" <${process.env.MAIL}>`,
	to: to,
	subject: object,
	html: content(object, body)
});

export default sendMail;