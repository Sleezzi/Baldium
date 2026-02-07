import { Rcon as _Rcon } from "rcon-client";

class Rcon {
	constructor({ host, port, password }: { host: string, port?: number, password: string }) {
		this.rcon = new _Rcon({
			host: host,
			port: port,
			password: password
		});
		this.rcon.on("authenticated", () => this.connected = true);
		this.rcon.on("end", () => this.connected = false);
	}
	private rcon: _Rcon;
	public connect = () => new Promise<void>(async (resolve, error) => {
		try {
			await this.rcon.connect();
			this.rcon.once("authenticated", () => resolve());
			this.rcon.once("error", () => error());
		} catch (err) {
			console.error(err);
			error();
		}
	});
	public connected: boolean = false;
	public send = (command: string) => new Promise<string>(async (resolve, error) => {
		try {
			if (!this.connected) {
				await this.connect();
			}
			const response = await this.rcon.send(command);
			resolve(response);
		} catch (err) {
			console.error(err);
			error();
		}
	});
	public disconnect = () => new Promise<void>((resolve, error) => {
		try {
			this.rcon.end();
			this.rcon.once("end", () => resolve());
		} catch (err) {
			console.error(err);
			error(err);
		}
	})
}

export default Rcon;