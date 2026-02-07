const { createHash } = require("crypto");

jest.mock("../../components/queryAsync", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/logs", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/connections", () => ({
	__esModule: true,
	default: jest.fn()
}));

const route = require("./change-password-with-code.http");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");
const connections = require("../../components/connections");


test("Changes the user's password when they receive a code by email after clicking \"Forgot my password\"", async () => {
	const body = { email: "test@sleezzi.fr", code: "123456", password: "password1234" };
	queryAsync.default
	.mockResolvedValueOnce(new Promise((resolve) => resolve([ { code: createHash("sha256").update(body.code).digest("hex"), attempts: 1, expireAt: Date.now() / 1000 + 1000 * 60 * 15 } ])))
	.mockResolvedValueOnce(new Promise((resolve) => resolve([ { username: "sleezzi" } ])));
	
	// connections.default.mockResolvedValue(new Map());
	
	Logs.default.mockResolvedValue();

	await route.execute({ body }, {
		status: (status) => {
			expect(status).toBe(200);
			return {
				json: (response) => expect(response).toStrictEqual({ status, response: "Password changed" })
			}
		}
	});
});