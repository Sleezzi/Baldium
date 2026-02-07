const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
	setupFiles: [ "<rootDir>/jest.setup.js" ],
	testEnvironment: "node",
	transform: {
		...tsJestTransformCfg,
	},
};