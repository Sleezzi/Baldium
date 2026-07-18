import * as mysql from "mysql2";

const db = mysql.createPool({
	host: process.env.DATABASE_HOST,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME,
	waitForConnections: true,
	connectionLimit: 3,
	queueLimit: 0,
	supportBigNumbers: true
});

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