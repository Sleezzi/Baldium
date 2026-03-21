async function verifyIP(ip: string | null | undefined) {
	try {
		if (!ip) {
			return false;
		}
		const ipapi = await fetch(`https://api.ipapi.is/?q=${ip}`);
		if (ipapi.status !== 200) {
			return false;
		}
		const ipdata: {
			status: "success",
			location: {
				latitude: number,
				longitude: number
			},
			is_datacenter: boolean,
			is_proxy: boolean,
			is_abuser: boolean
			is_tor: boolean
		} = await ipapi.json();
		
		return {
			location: {
				lat: ipdata.location.latitude,
				long: ipdata.location.longitude
			},
			isAllowed: (() => {
				if (process.env.ALLOWED_IPS) {
					if (process.env.ALLOWED_IPS.split(" ").find((_ip) => _ip === ip)) return true;
					
					if (ipdata.is_datacenter || ipdata.is_proxy) return false;
					if (ipdata.is_abuser) return false;
					if (ipdata.is_tor) return false;
				}
				return true;
			})()
		}
	} catch (err) {
		console.error(err);
		return false;
	}
}

export default verifyIP;