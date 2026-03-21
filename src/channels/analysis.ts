import Channel from "../types/Channel";
import { Trigger } from "../components/subscription";

const route: Channel = {
	name: "server_analysis",
	execute: async () => {
		try {
			if (!process.env.CATVISOR) {
				throw new Error("The Cadvisor URL is missing. Go to \"https://wiki.sleezzi.fr/en/baldium/compose_yml#environment-variables\" to see which environment variables are required");
			}
			const fun = async () => {
				try {
					const response = await fetch(process.env.CATVISOR!);
					if (!response.ok) {
						throw new Error(`An error occurred while retrieving container metrics data. Code: ${response.status}`);
					}
					const data = await response.json();
					console.log(data);
				} catch (err) {
					console.error(err);
				}
			}

			setInterval(fun, 1_000);

			// Trigger("server_analysis", {
			// 	ram: {
			// 		usage: stats.memory_stats.usage,
			// 		limit: stats.memory_stats.limit
			// 	},
			// 	cpus: {
			// 		delta: (stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage),
			// 		systemDelta: (stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage),
			// 		core: stats.cpu_stats.online_cpus
			// 	}
			// });
		} catch (err) {
			console.error(err);
		}
	}
}

module.exports = route;