const token = "Super Secret d@ta";

const secret = "0c3d94bdf2178c196bab8fb1c6de18f4e944daaa76c9f7e90ab367f1605421b9";

const { createCipheriv, createDecipheriv, randomBytes } = require("crypto");

function cipher(value) {
	const key = Buffer.from(secret, "hex");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final()
	]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decipher(value) {
	const key = Buffer.from(secret, "hex");
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

const ciphered = `lp8kg85YUVjy5Qu49BB+45OhmMOI9YEKINuzC1IMp807yQFsy3mYb/pPnBxF75PqpeZsFWbn1mWfK60kVPdcOP9+qotdhGnLHBKH0avP7ZYoWDa7OhN+v1Oem/WHnJNo1cWNDDdOS1F2VaGPIQd/7rebBfPM516Hhvnr/QQLj2rQ39DDA1lXkNVwfqq05uLS2DN69H9w6tOwZZDOlCWlr638pq+9bTuZNN+DZg3cIejBd6aKhTxFSHlgpLk=
fC8Sk+vnGlG3WrJijppbhjj0zsjIc+ZgokKpIJx8Djf/2F4STFsZOLNL3LKMBr5BXvMp3Oo/t9F3/+txvgTfTavl4ahJCR9uU3VVHa3JEYSoYG1/BaPKdAurpyAiPcKWyRYcDhFj
tGNfhjMGhtJnPnNM2msJ4rDYvWwXydmc4MSE+lxVv+JKJe3iXhNkAU1NKbckr9mSG2q1633rFSsjNSlETh7BFKqiyOUMSLAhA1LnjymjU8h69KJ1j8006TwBfqOG4gTKWxdfCks3i8D/fYTdzBZVoHw1E9nJPPHZB4uqdmlZJuAYLttWk/Vgt+D9ResGLqkr1IqOKt6AOMzh3mXak8WJyVlfmd8vunj6Xw5LWmhAzrfuz4A=
XFXHl08MtBdXu3mlfXrPv7wh4HGIBsR7cFLU2JdPda8W0hFZVC0wvPhX9N7JluyYtgSpx1KSFXT0rj9W84hCPxoC+0kxvsfSUU/Huxil3OrDF3bZGHFb1d3RgllzA/jisAyAfdo5mgqPPN/Vgso+86t/u6iUoZqtfu66lV3XpVGd9IcKrvoyB4kpnz7XddLke0z6PR1qVsG9FdPV0GQf+E4JlowlXQDfgsmDzqg5xtksbtg=
Dn/oFOWsWgFR28OGsTHlfuuHIAG9A7LBoxNgKa78K64TAtukf600qcrouXP93DJ9lJHlxxmzbLk0tToM567gBJxoUAdyFCLauA+XbuEycVpszbVdO+7HRIqPb/3HkVienXDSaXzj9bxjcu+GhK4=
YmRWR4EAcgFvG2ZBgzPKPXR179MkVC9msxqPiQAhLzih7Xunm+JQnj9u4pF7VWvJmDVqcm2XnO2Y/P02Ax0LCb7B1cU3ezDtOpFmz65OIaKyFRc+jR8fGL3BVU9X2VgPSJID5TMf3n29+JhGtj0=`;

for (const line of ciphered.split("\n")) {
	console.log(decipher(line));
}