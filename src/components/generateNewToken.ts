import { sign } from "jsonwebtoken";

function generateNewToken(userId: number) {
	if (!process.env.SECRET_KEY) {
		throw new Error("The secret key used for encryption is missing. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
	}
	return sign({ userId: userId }, process.env.SECRET_KEY, { expiresIn: 2629743 });
}


export default generateNewToken;