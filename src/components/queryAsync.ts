import { db } from "../index";

const queryAsync = (request: string, ...args: any) => new Promise<any>((resolve, error) => { // Query to DB
	try {
		db.query(request, args, (err, result) => {
			if (err) {
				error(err);
				return;
			}
			resolve(result);
		});
	} catch (err) {
		error(err);
	}
});

export default queryAsync;