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
	const account = { username: "sleezzi", email: "contact@sleezzi.fr" };
	const connection = { username: account.username, ip: "192.*.*.1", last_connection: Date.now() / 1000, location: null, os: "Linu", navigator: "Chrome" }
	queryAsync.default
	.mockResolvedValueOnce(new Promise((resolve) => resolve([ account ])))
	.mockResolvedValueOnce(new Promise((resolve) => resolve([ connection ])));
	
	Logs.default.mockResolvedValue();

	await route({
		username: account.username,
		permissions: 8,
		ip: "192.168.0.1"
	}, null, (status, response) => 
		expect({ status, response })
		.toStrictEqual(
			{
				status: 200,
				response: {
					email: `${account.email.split("@")[0][0]}${"*".repeat(account.email.split("@")[0].length - 1)}@${account.email.split("@")[1]}`,
					permissions: 8,
					connections: [ connection ]
				}
			}
		)
	);
});