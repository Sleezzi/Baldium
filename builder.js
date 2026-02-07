const { existsSync, rmSync, mkdirSync, readdirSync, appendFileSync, readFileSync } = require("fs");
const esbuild = require("esbuild");

const src = process.env.BUILDER_SOURCE || "./src";
const dist = process.env.BUILDER_DIST || "./dist";

const filters = [
	dist,
	new RegExp(`^${dist}.*`),
	/\.md^/,
	"tsconfig.json",
];

const output = {
	files: 0,
	directories: 0
}

const navigate = (path) => {
	for (const file of readdirSync(path, { withFileTypes: true })) {
		const pathFile = `${path.replace(src, "")}/${file.name}`;

		let filtred = false;
		for (const filter of filters) {
			if (typeof filter === "string") {
				if (filter.replace(src, "") === pathFile) filtred = true;
			}
			if (typeof filter === "object") {
				if (!"test" in filter) {
					throw new Error("Invalid filter:", filter, "\nA valid filter is a string or a RegExp");
				}
				if (filter.test(pathFile)) {
					filtred = true;
				}
			}
		}
		
		if (filtred) continue;
		
		if (file.isDirectory()) {
			mkdirSync(`${dist.replace(/\/$/, "")}/${pathFile}`);
			navigate(`${src.replace(/\/$/, "")}${pathFile}`);
			output.directories += 1;
		} else if (file.isFile()) {
			if (file.name.endsWith(".js") || file.name.endsWith(".ts")) continue;
			appendFileSync(`${dist.replace(/\/$/, "")}/${pathFile}`, readFileSync(`${src.replace(/\/$/, "")}/${pathFile}`));
			output.files += 1;
		}
	}
}
if (!existsSync(src)) {
	throw new Error("Invalid source: Do not exist!");
}

if (existsSync(dist)) {
	rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist);

navigate(src);

esbuild.buildSync({
	entryPoints: [`${src}/**/*.ts`],
	outbase: src,
	outdir: dist,
	bundle: false,
	platform: "node",
	target: "node20",
	sourcemap: !!process.argv.find((opt) => opt === "--debug"),
	minify: !!process.argv.find((opt) => opt === "--minify"),
	loader: { ".ts": "ts" },
	format: "cjs",
	tsconfig: "./tsconfig.json",
	write: true
});

console.log(`Builded ${output.files} files from ${output.directories} directories`);