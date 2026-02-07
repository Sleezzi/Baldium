jest.mock("../../components/queryAsync", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/logs", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/sendMail", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/connections", () => ({
	__esModule: true,
	default: jest.fn()
}));

const route = require("./delete.socket");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");
const sendMail = require("../../components/sendMail");
const connections = require("../../components/connections");


test("Delete a user account", async () => {
	const account = { username: "sleezzi", email: "test@sleezzi.fr" };
	queryAsync.default
	.mockResolvedValueOnce(new Promise((resolve) => resolve([ account ])))
	.mockResolvedValueOnce(new Promise((resolve) => resolve(null)));
	
	Logs.default.mockResolvedValue();

	sendMail.default.mockResolvedValue();
	connections.default.mockResolvedValue({ delete: () => {} });

	await route({
		username: account.username,
		permissions: 8,
		ip: "192.168.0.1"
	}, null, (status, response) => expect({ status, response }).toStrictEqual({ status: 200, response: "Success" }));
});