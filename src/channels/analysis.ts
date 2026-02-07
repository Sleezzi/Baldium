import Channel from "../types/Channel";
import docker from "../components/docker";
import { Trigger } from "../components/subscription";

const route: Channel = {
	name: "server_analysis",
	execute: async () => {
		try {
			const stream = await docker.stats({ stream: true });

			stream.on("data", (chunk) => {
				try {
					const stats = JSON.parse(chunk.toString());
					
					Trigger("server_analysis", {
						ram: {
							usage: stats.memory_stats.usage,
							limit: stats.memory_stats.limit
						},
						cpus: {
							delta: (stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage),
							systemDelta: (stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage),
							core: stats.cpu_stats.online_cpus
						}
					});
				} catch (err) {
					console.error(err);
				}
			});
		} catch (err) {
			console.error(err);
		}
	}
}

module.exports = route;