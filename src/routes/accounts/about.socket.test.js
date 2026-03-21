jest.mock("../../components/queryAsync", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/logs", () => ({
	__esModule: true,
	default: jest.fn()
}));

const route = require("./about.socket");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");


test("Retrieves user account information", async () => {
	const account = { id: process.env.ACCOUNT_ID, username: process.env.ACCOUNT_USERNAME, email: process.env.ACCOUNT_EMAIL };
	const connection = { userId: account.id, ip: process.env.ACCOUNT_IP, last_connection: Date.now() / 1000, location: null, os: "Linux", model: "SuperC00lModel", navigators: JSON.stringify({ name: "Firefox", version: "1.2.3" }) }
	queryAsync.default
	.mockResolvedValueOnce([ account ])
	.mockResolvedValueOnce([ connection ]);
	
	Logs.default.mockResolvedValue();

	const response = jest.fn();

	await route({
		userId: account.userId,
		permissions: 8,
		ip: process.env.ACCOUNT_IP
	}, null, response);

	expect(response).toHaveBeenCalledWith(
		200,
		{
			email: `${account.email.split("@")[0][0]}${"*".repeat(account.email.split("@")[0].length - 1)}@${account.email.split("@")[1]}`,
			permissions: 8,
			connections: [ connection ]
		}
	);
});