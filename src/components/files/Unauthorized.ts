const unauthorizeds: (string | RegExp)[] = [
	/.*\.\/.*/,			// Block ./
	/.*\.env/,			// Block .env files
	".rcon-cli.yaml",	// Contain rcon password
	/.*\0.*/,			// Block null byte

	"run.bat",			// Better hidden
	"run.sh",			// Better hidden
	"eula.txt",			// Better hidden
];

export default unauthorizeds;