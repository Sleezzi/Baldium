import "express";

declare module "express-serve-static-core" {
	interface Request {
		user: {
			location: {
				lat: number,
				long: number
			},
			navigators: {
				name: string,
				version: string,
			}[],
			device: {
				model: string,
				mobile: boolean,
				os: string
			}
		}
	}
}