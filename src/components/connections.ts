const connections = new Map<number, {
	send: (message: any, service: string, object: string) => void,
	close: (reason?: string) => void,
	permissions: number
}>;

export default connections;