export type Connection = {
	email: string,
	code: string,
	attempts: number,
	code_expire_in: number
}

export type Ips = {
	hash: string,
	id: string,
	"last-connection": number,
	ip: string
}

type Account = {
	username: string,
	email: string,
	hash: string,
	discord: number,
	permissions: number
}
export default Account;