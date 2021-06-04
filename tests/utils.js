/* eslint-env jest */

const os = require('os');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const webpack5 = require('webpack5');

const OUTPUT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wbt-tests-'));

function testPlugin(webpack, webpackConfig, expectedResults, outputFile, done, expectErrors, expectWarnings) {
  webpack(webpackConfig, (err, stats) => {
    const compilationErrors = (stats.compilation.errors || []).join('\n');
    const compilationWarnings = (stats.compilation.warnings || []).join('\n');

    expect(err).toBeFalsy();

    if (expectErrors) {
      expect(compilationErrors).toEqual(expectErrors);
    } else {
      expect(compilationErrors).toBe('');
    }

    if (expectWarnings) {
      expect(compilationWarnings).toEqual(expectWarnings);
    } else {
      expect(compilationWarnings).toBe('');
    }

    const outputFileExists = fs.existsSync(path.join(OUTPUT_DIR, outputFile));
    expect(outputFileExists).toBe(true);
    if (!outputFileExists) {
      return done();
    }
    const trackerStatsContent = fs.readFileSync(path.join(OUTPUT_DIR, outputFile)).toString();

    const trackerStats = JSON.parse(trackerStatsContent);
    expect(trackerStats).toMatchObject(expectedResults);

    done();
  });
}

function getWebpack4WarningMessage() {
  if (!webpack.version || !webpack.version.startsWith('4')) return null;

  return `NoModeWarning: configuration
The 'mode' option has not been set, webpack will fallback to 'production' for this value. Set 'mode' option to 'development' or 'production' to enable defaults for each environment.
You can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/`;
}

function getWebpack5WarningMessage() {
  if (!webpack5.version || !webpack5.version.startsWith('5')) return null;

  return `NoModeWarning: configuration
The 'mode' option has not been set, webpack will fallback to 'production' for this value.
Set 'mode' option to 'development' or 'production' to enable defaults for each environment.
You can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/`;
}

module.exports = {
  OUTPUT_DIR: OUTPUT_DIR,
  testPlugin: testPlugin,
  getWebpack4WarningMessage: getWebpack4WarningMessage,
  getWebpack5WarningMessage: getWebpack5WarningMessage,
};
