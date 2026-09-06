import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
	region: "auto",
	endpoint: process.env.R2_ENDPOINT,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
});


export async function getBackup() {
	const objects: { name: string, size: number, date: Date }[] = [];
	let continuationToken: string | undefined;

	do {
		const response = await r2Client.send(
			new ListObjectsV2Command({
				Bucket: process.env.R2_BUCKET_NAME!,
				Prefix: "backup/",
				ContinuationToken: continuationToken,
			}),
		);

		for (const obj of response.Contents ?? []) {
			if (obj.Key && obj.Size && obj.LastModified) {
				objects.push({ name: obj.Key, size: obj.Size, date: obj.LastModified });
			}
		}

		continuationToken = response.NextContinuationToken;
	} while (continuationToken);

	return objects;
}