const { stat, rm, mkdir, readdir, appendFile, readFile } = require("fs/promises");
const esbuild = require("esbuild");
const { join } = require("path");

const src = process.env.BUILDER_SOURCE || join(__dirname, "./src");
const dist = process.env.BUILDER_DIST || join(__dirname, "./dist");

const filters = [
	dist,
	new RegExp(`^${dist}.*`),
	/\.md$/,
	/\.test\.js$/,
	"tsconfig.json",
];

const output = {
	files: 0,
	directories: 0
}

async function exist(path) {
	try {
		await stat(path);
		return true;
	} catch(_) {
		return false;
	}
}

const navigate = async (path) => {
	for (const file of await readdir(path, { withFileTypes: true })) {
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
			await mkdir(`${dist.replace(/\/$/, "")}/${pathFile}`);
			output.directories += 1;
			await navigate(`${src.replace(/\/$/, "")}${pathFile}`);
		} else if (file.isFile()) {
			if (file.name.endsWith(".ts")) continue;
			await appendFile(`${dist.replace(/\/$/, "")}/${pathFile}`, await readFile(`${src.replace(/\/$/, "")}/${pathFile}`));
			output.files += 1;
		}
	}
}
(async () => {
	if (!await exist(src)) {
		throw new Error("Invalid source: Do not exist!");
	}
	if (!(await stat(src)).isDirectory()) {
		throw new Error("Invalid source: Not a directory!");
	}

	if (await exist(dist)) {
		await rm(dist, { recursive: true, force: true });
	}
	await mkdir(dist);

	await navigate(src);

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

	console.log(`Builded ${output.files} files from ${output.directories} directories in ${dist}`);
})();