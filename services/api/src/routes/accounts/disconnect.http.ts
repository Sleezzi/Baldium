import { HTTP } from "@baldium/shared-types/src/Route.js";

const route: HTTP<{}, {}> = {
	method: "DELETE",
	schema: {},
	prehandler: async (request, response, done) => {},
	handler: async (request, response) => {
		try {
			response
			.status(200)
			.setCookie(
				"token",
				"",
				{
					maxAge: 0
				}
			)
			.send({
				status: 200,
				response: "Success"
			});
		} catch (err) {
			console.error(err);
			return response.status(500).send({
				status: 500,
				response: "Internal error"
			});
		}
	}
}

module.exports = route;