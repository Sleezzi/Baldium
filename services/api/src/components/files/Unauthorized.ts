import { join, resolve, sep } from "path";

export const blocklist: (string | RegExp)[] = [
	/.*\.env/,			// Block .env files
	".rcon-cli.yaml",	// Contain rcon password
	/.*\0.*/,			// Block null byte

	"run.bat",			// Better hidden
	"run.sh",			// Better hidden
	"eula.txt",			// Better hidden
];

export const isNotTraversal = (root: string, ...path: string[]): false | string => {
	const resolvedRoot = resolve(root) + sep;
	const resolvedPath = resolve(join(root, ...path));

	if (
		!resolvedPath.startsWith(resolvedRoot) &&	// Check if the path start with /minecraft/
		resolvedPath !== resolve(root)				// Check if it's the root itself (/minecraft)
	) return false;
	// resolve("/minecaft/") -> "/minecraft" + "/" => "/minecraft/"
	return resolvedPath;
}