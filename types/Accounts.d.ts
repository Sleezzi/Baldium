export type Connection = {
	email: string,
	code: string,
	attempts: number,
	code_expire_in: number
}

type Account = {
	id: string,
	username: string,
	email: string,
	hash: string,
	discord: number,
	permissions: number
}
export default Account;