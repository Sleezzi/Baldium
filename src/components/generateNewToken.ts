import { sign } from "jsonwebtoken";

function generateNewToken(username: string, ) {
	if (!process.env.SECRET_KEY) {
		throw new Error("The secret key used for token generation is not defined. Add \"SECRET_KEY\" to the environment variables to define the secret key.");
		return null;
	}
	return sign({ username: username }, process.env.SECRET_KEY, { expiresIn: 2629743 });
}


export default generateNewToken;