import { appendFileSync, existsSync, mkdirSync, rmSync, statSync } from "fs";
import MakeNumberMoreReadable from "./makeNumberMoreReadable";
import IndexFolder from "./indexFolder";

function Logs(username: string, message: string, ip: string) {
	try {
		if (!existsSync(process.env.LOGS_PATH!)) {
			throw new Error("Missing the log's folder");
		}
		if (!existsSync(`${process.env.LOGS_PATH}/API`)) {
			mkdirSync(`${process.env.LOGS_PATH}/API`);
		}
		if (!existsSync(`${process.env.LOGS_PATH}/API/${username.toLowerCase()}`)) {
			mkdirSync(`${process.env.LOGS_PATH}/API/${username.toLowerCase()}`);
		}
		appendFileSync(
			`${process.env.LOGS_PATH}/API/${username.toLowerCase()}/${MakeNumberMoreReadable(new Date().getDate())}-${MakeNumberMoreReadable(new Date().getMonth() + 1)}.log`,
			`[${MakeNumberMoreReadable(new Date().getHours())}:${MakeNumberMoreReadable(new Date().getMinutes())}:${MakeNumberMoreReadable(new Date().getSeconds())}] | (${ip}) | ${message}\n`,
		);
	} catch (err) {
		console.error(err);
	}
}

export default Logs;


export function AutocleanLogs() {
	try {
		// if (!existsSync(process.env.LOGS_PATH!)) {
		// 	throw new Error("Missing the log's folder");
		// }
		// console.log("Starting the autoclean");
		// let count = 0;
		
		// for (const path of IndexFolder(process.env.LOGS_PATH!).filter((file) => file.type === "file").map((file) => file.path)) {
		// 	const stats = statSync(path);
		// 	if (stats.mtime.getTime() > (process.env.LOGS_LIFETIME ? Number(process.env.LOGS_LIFETIME) : 30) * 24 * 60 * 60 * 1000) {
		// 		rmSync(path);
		// 		count++;
		// 		console.log(`The log file ${path} has been deleted`);
		// 	}
		// }
		// console.log(`Automatic log file cleanup has finished, ${count} file(s) have been deleted.`);
	} catch (err) {
		console.error(err);
	}
}