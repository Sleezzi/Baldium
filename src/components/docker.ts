import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const container = docker.getContainer("minecraft-server");

export default container;