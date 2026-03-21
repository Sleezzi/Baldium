const { createHash } = require("crypto");

jest.mock("../../components/queryAsync", () => ({
	__esModule: true,
	default: jest.fn()
}));
jest.mock("../../components/logs", () => ({
	__esModule: true,
	default: jest.fn()
}));

const route = require("./change-password-with-code.http");
const Logs = require("../../components/logs");
const queryAsync = require("../../components/queryAsync");

test("Changes the user's password when they receive a code by email after clicking \"Forgot my password\"", async () => {
	const body = { email: process.env.ACCOUNT_EMAIL, code: "123456", password: "password1234" };
	queryAsync.default
	.mockResolvedValueOnce([ { code: createHash("sha256").update(body.code).digest("hex"), attempts: 1, expireAt: Date.now() / 1000 + 1000 * 60 * 15 } ])
	.mockResolvedValueOnce([ { id: process.env.ACCOUNT_ID } ]);
	
	Logs.default.mockResolvedValue();

	const response = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn()
	}

	await route.execute({ body }, response);
	expect(response.status).toHaveBeenCalledWith(200);
	expect(response.status).toHaveBeenCalledWith({ status: 200, response: "Password changed" });
});