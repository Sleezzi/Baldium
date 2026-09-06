const connections = new Map<number, {
	send: (message: any, service: string, object: string) => Promise<void>,
	close: (reason?: string) => void,
	permissions: number,
	connectionId: string,
}>();

export default connections;