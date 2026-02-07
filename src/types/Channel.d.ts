type Channel = {
	name: string,
	execute: () => void | Promise<void>
}

export default Channel;