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

const route = require("./delete.socket");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");
const sendMail = require("../../components/sendMail");
const connections = require("../../components/connections");


test("Delete a user account", async () => {
	const account = { id: process.env.ACCOUNT_ID, username: process.env.ACCOUNT_USERNAME, email: process.env.ACCOUNT_EMAIL };
	queryAsync.default
	.mockResolvedValueOnce([ account ])
	.mockResolvedValueOnce(null);
	
	Logs.default.mockResolvedValue();

	sendMail.default.mockResolvedValue();
	
	const response = jest.fn();

	await route({
		userId: account.id,
		permissions: process.env.ACCOUNT_PERMISSION,
		ip: process.env.ACCOUNT_IP
	}, null, response);
	expect(response).toHaveBeenCalledWith(200, "Success");
});