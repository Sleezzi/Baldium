import { decode, verify } from "jsonwebtoken";

type Response = {
	success: false,
	message: string
} | {
	success: true,
	message: number
}

async function auth(token: string): Promise<Response> {
	try {
		if (!verify(token, process.env.SECRET_KEY!)) {
			return {
				success: false,
				message: "INVALID_TOKEN"
			};
		}
		const data = decode(token); // Decode the token to obtain the playload. The playload must contain the client's userid
		
		if (!data) { // Check if the userid is present in the playload. If it is not, it means the server signed a token without including a playload.
			return {
				success: false,
				message: "MISSING_PAYLOAD"
			};
		}
		const payload: { userId: number } = typeof data === "string" ? JSON.parse(data) : data;
		if (!payload) {
			return {
				success: false,
				message: "INVALID_PAYLOAD"
			}
		}
		if (!("userId" in payload)) {
			return {
				success: false,
				message: "MISSING_USERID"
			}
		}
		return {
			success: true,
			message: payload.userId
		}
	} catch (err) {
		console.error(err);
		return {
			success: false,
			message: "INTERNAL_ERROR"
		}
	}
}

export default auth;