import { stat } from "fs/promises";

async function fsExist(path: string) {
	try {
		await stat(path);
		return true;
	} catch(_) {
		return false;
	}
}
export default fsExist;