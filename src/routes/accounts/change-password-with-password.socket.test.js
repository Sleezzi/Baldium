const { genSalt, hash } = require("bcrypt");

jest.mock("../../components/queryAsync", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/logs", () => ({
	__esModule: true,
	default: jest.fn()
}));

const route = require("./change-password-with-password.socket");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");
const { default: connections } = require("../../components/connections");

test("Changes the user's password when they receive a code by email after clicking \"Forgot my password\"", async () => {
	const account = { userId: process.env.ACCOUNT_ID, username: process.env.ACCOUNT_USERNAME, email: process.env.ACCOUNT_EMAIL };
	const args = { current: "password1234", new: "PASSWORD1234" };

	const salt = await genSalt();
	
	const hashedPassword = await hash(args.current, salt);

	queryAsync.default
	.mockResolvedValueOnce([ { hash: hashedPassword, id: account.userId } ])
	.mockResolvedValueOnce()
	.mockResolvedValueOnce();
	
	Logs.default.mockResolvedValue();
	const response = jest.fn();

	await route({
		userId: account.userId,
		permissions: process.env.ACCOUNT_PERMISSION,
		ip: process.env.ACCOUNT_IP
	}, args, response);

	expect(response).toHaveBeenCalledWith({ status: 200, response: "Password changed" });
	// After execution, the test user should be removed from the list of connected users, and then reinstated for other tests.
	connections.set(account.userId, {
		send: () => {},
		close: () => {},
		permissions: process.env.ACCOUNT_PERMISSION
	});
});