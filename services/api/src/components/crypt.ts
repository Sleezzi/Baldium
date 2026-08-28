import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function cipher(value: string) {
	const key = Buffer.from(process.env.SECRET_KEY!, "hex");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final()
	]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
export function decipher(value: string) {
	const key = Buffer.from(process.env.SECRET_KEY!, "hex");
	const data = Buffer.from(value, "base64");

	const iv = data.subarray(0, 12);
	const tag = data.subarray(12, 28);
	const payload = data.subarray(28);

	const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
	decipher.setAuthTag(tag);

	return Buffer.concat([
		decipher.update(payload),
		decipher.final()
	]).toString("utf8");
}