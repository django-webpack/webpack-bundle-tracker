/* eslint-env jest */
"use strict";

const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const webpack = require("webpack");

const BundleTrackerPlugin = require("../lib/index.js");

const OUTPUT_DIR = path.resolve(__dirname, "..", "dist", "test-base");

jest.setTimeout(30000);
process.on("unhandledRejection", r => console.log(r));
process.traceDeprecation = true;

function testPlugin(
	webpackConfig,
	expectedResults,
	outputFile,
	done,
	expectErrors,
	expectWarnings
) {
	webpack(webpackConfig, (err, stats) => {
		expect(err).toBeFalsy();
		const compilationErrors = (stats.compilation.errors || []).join("\n");
		if (expectErrors) {
			expect(compilationErrors).not.toBe("");
		} else {
			expect(compilationErrors).toBe("");
		}
		const compilationWarnings = (stats.compilation.warnings || []).join("\n");
		if (expectWarnings) {
			expect(compilationWarnings).not.toBe("");
		} else {
			expect(compilationWarnings).toBe("");
		}

		const outputFileExists = fs.existsSync(path.join(OUTPUT_DIR, outputFile));
		expect(outputFileExists).toBe(true);
		if (!outputFileExists) {
			return done();
		}
		const trackerStatsContent = fs
			.readFileSync(path.join(OUTPUT_DIR, outputFile))
			.toString();

		const trackerStats = JSON.parse(trackerStatsContent);
		expect(trackerStats).toMatchObject({
			status: "done",
			chunks: expect.any(Object)
		});

		expect(trackerStats).toMatchObject(expectedResults);

		done();
	});
}

describe("BundleTrackerPlugin", () => {
	beforeEach(done => {
		rimraf(OUTPUT_DIR, done);
	});

	it("It should generate stats for a single entrypoint", done => {
		const expectErrors = null;
		let expectWarnings = null;

		if (webpack.version && webpack.version.startsWith("4")) {
			expectWarnings = `NoModeWarning: configuration
The 'mode' option has not been set, webpack will fallback to 'production' for this value. Set 'mode' option to 'development' or 'production' to enable defaults for each environment.
You can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/`;
		}

		testPlugin(
			{
				context: __dirname,
				entry: path.resolve(__dirname, "fixtures", "index.js"),
				output: {
					path: OUTPUT_DIR,
					filename: "[name]-[hash].js",
					publicPath: "http://localhost:3000/assets/bundles/"
				},
				plugins: [
					new BundleTrackerPlugin({
						path: OUTPUT_DIR
					})
				]
			},
			{
				publicPath: "http://localhost:3000/assets/bundles/",
				chunks: {
					main: [
						{
							name: expect.stringMatching(/^main-[a-z0-9]+.js$/),
							publicPath: expect.stringMatching(
								/^http:\/\/localhost:3000\/assets\/bundles\/main-[a-z0-9]+.js$/
							),
							path: expect.stringMatching(
								/dist(\/|\\)test-base(\/||\\)main-[a-z0-9]+.js$/
							)
						}
					]
				}
			},
			"webpack-stats.json",
			done,
			expectErrors,
			expectWarnings
		);
	});
});
