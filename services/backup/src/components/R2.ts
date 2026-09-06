import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

const r2Client = new S3Client({
	region: "auto",
	endpoint: process.env.R2_ENDPOINT,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
});

export async function getBackup(prefix: string) {
	const objects: { key: string; lastModified: Date }[] = [];
	let continuationToken: string | undefined;

	do {
		const response = await r2Client.send(
			new ListObjectsV2Command({
				Bucket: process.env.R2_BUCKET_NAME!,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			}),
		);

		for (const obj of response.Contents ?? []) {
			if (obj.Key && obj.LastModified) {
				objects.push({ key: obj.Key, lastModified: obj.LastModified });
			}
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	objects.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime()); // older first

	return objects.map((o) => o.key);
}
export async function uploadStreamToR2(stream: Readable, key: string): Promise<void> {
	const upload = new Upload({
		client: r2Client,
		params: {
			Bucket: process.env.R2_BUCKET_NAME!,
			Key: key,
			Body: stream,
			ContentType: "application/zip",
		},
		queueSize: 4,
		partSize: 10 * 1024 * 1024, // 10 Mo par part
		leavePartsOnError: false,
	});

	await upload.done();
}

export async function deleteBackup(key: string) {
	await r2Client.send(
		new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
	);
}