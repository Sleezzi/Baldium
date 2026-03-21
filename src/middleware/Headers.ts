import verifyIP from "../components/verifyIP";
import Middleware from "../types/Middleware";

const middleware: Middleware = async (request, response, next) => {
	try {
		response.setHeader("Accept-CH", "sec-ch-ua, sec-ch-ua-platform, sec-ch-ua-mobile");
		response.setHeader("Critical-CH", "sec-ch-ua, sec-ch-ua-platform, sec-ch-ua-mobile");
		
		if (typeof request.headers["sec-ch-ua"] !== "string") { // We check if the headers contain sec-ch-ua, which is used to identify the browser
			response.status(403).json({
				status: 403,
				response: "The server is unable to determine which browser you are using. To secure your account, we request several pieces of information about the device you are using. Changing your browser may resolve the issue."
			});
			return;
		}
		const navigators = (() => {
			try {
				if (request.headers["sec-ch-ua"]) {
					if (request.headers["sec-ch-ua"].length > 100) return false;
					const n = request.headers["sec-ch-ua"].split(/"([a-zA-Z ]*)";v="([0-9]*)",? ?/).filter((value) => value.length > 0 && !value.includes("\""));
					return n.map((value, index) => index % 2 === 0 ? ({ name: value, version: n[index + 1] }) : null) // Only return data if the index is pair
					.filter((value) => !!value); // Extract data from useragent and only keep non null and well cutted data
				}
				if (request.headers["user-agent"]) {
					const splited = request.headers["user-agent"]!.split(/\([a-zA-Z0-9; _:\.]*\) [a-zA-Z\/0-9\.]* (\(KHTML, like Gecko\) )?([a-zA-Z]*)\/([0-9\.]*)/);
					return [{
						name: splited[3],
						version: splited[4]
					}];
				}
			} catch (err) {
				console.error(err);
			}
			return false;
		})();
		if (!navigators) { // We check if the sec-ch-ua headers are not too large
			response.status(413).json({
				status: 413,
				response: "The server was unable to determine which browser you are using."
			});
			return;
		}
		const os = (() => {
			try {
				if (typeof request.headers["sec-ch-ua-platform"] === "string") {
					return request.headers["sec-ch-ua-platform"]!;
				}
				if (request.headers["user-agent"]) {
					const splited = request.headers["user-agent"]!.split(/\([a-zA-Z0-9]*; ([a-zA-Z; ]*) [a-zA-Z0-9_; :\.]*\)/);
					return splited[1];
				}
			} catch (err) {
				console.error(err);
			}
			return false;
		})();
		if (!os) { // We check if the sec-ch-ua headers are not too large
			response.status(413).json({
				status: 413,
				response: "The server was unable to determine which operating system you are using."
			});
			return;
		}
		
		const ipdata = await verifyIP(request.ip);
		if (!ipdata) {
			response.status(403).json({
				status: 403,
				response: "The server was unable to verify the IP address you are using."
			});
			return;
		}
		if (!ipdata.isAllowed) {
			response.status(403).json({
				status: 403,
				response: "The server was unable to verify the authenticity of the IP address you are using."
			});
			return;
		}
		
		request.user = {
			location: { // The user's location is recorded using their IP address.
				lat: ipdata.location.lat,
				long: ipdata.location.long
			},
			navigators: navigators,
			device: {
				model: typeof request.headers["sec-ch-ua-model"] === "string" ? request.headers["sec-ch-ua-model"] : "Unknown", // Browsers often only provide an empty string; if this is the case, we use Unknown.
				os: os,
				mobile: typeof request.headers["sec-ch-ua-mobile"] === "string" ? request.headers["sec-ch-ua-mobile"] === "?1" : (request.headers["user-agent"]?.includes("Mobile") || false)
			}
		};
		next();
	} catch(err) {
		console.error(err);
		response.status(500).json({
			status: 500,
			response: "Internal error"
		});
	}
}

module.exports = middleware;