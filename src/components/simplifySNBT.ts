// Fonction qui simplifie n'importe quel objet NBT
function simplifySNBT(obj: any): any {
	try {
		if (obj && typeof obj === "object" && "value" in obj && Object.keys(obj).length === 1) {
			return obj.value;
		}

		if (Array.isArray(obj)) {
			return obj.map((v) => simplifySNBT(v));
		}

		if (obj && typeof obj === "object") {
			const out: any = {};
			for (const key in obj) {
				out[key] = simplifySNBT(obj[key]);
			}
			return out;
		}
		return obj;
	} catch (err) {
		console.error(err);
		return {};
	}
}
export default simplifySNBT;