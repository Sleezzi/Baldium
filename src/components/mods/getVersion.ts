

async function getVersion(id: string): Promise<void | ModDetails> {
	try {
		
		
		return latest;
	} catch (err) {
		console.error(err);
	}
}

export default getVersion;