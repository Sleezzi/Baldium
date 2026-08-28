export type Accounts = {
	id: number,
	username: string,
	email: string,
	email_hash: string,
	hash: string,
	discord: number | null,
	permissions: number,
	version: string,
}

export type Discord = {
	id: number,
	refresh_token: string,
	access_token: string,
}

export type Recovry = {
	email: string,
	code: string,
	expireAt: number,
	attempts: number,
}

export type Connections = {
	email: string,
	code: string,
	code_expire_in: number,
	attemps: number,
}

export type Mods = {
	id: string,
	version: string
}

export type ModDependencies = {
	mod_id: string,
	dependency_id: string
}

export type Backup = {
	frequency: number,
	keep: number,
	last_backup: number,
	last_backup_size: number
}