/* eslint-env jest */
'use strict';

const path = require('path');
const rimraf = require('rimraf');

const { OUTPUT_DIR, testPlugin, getWebpack4WarningMessage } = require('./utils.js');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleTrackerPlugin = require('../lib/index.js');

jest.setTimeout(120000);
process.on('unhandledRejection', r => console.log(r));
process.traceDeprecation = true;

describe('BundleTrackerPlugin bases tests', () => {
  beforeEach(done => {
    rimraf(path.join(OUTPUT_DIR, '*'), done);
  });

  it('It should generate stats for a single entrypoint', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
          }),
        ],
      },
      {
        status: 'done',
        publicPath: 'http://localhost:3000/assets/bundles/',
        chunks: {
          main: [
            {
              name: expect.stringMatching(/^main-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/main-[a-z0-9]+.js$/),
              path: expect.stringMatching(/wbt-tests-\w{6}(\/||\\)main-[a-z0-9]+.js$/),
            },
          ],
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should add log time when option is set', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            logTime: true,
          }),
        ],
      },
      {
        status: 'done',
        startTime: expect.toBePositive(),
        endTime: expect.toBePositive(),
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should overwrite publicPath when option is set', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            publicPath: 'https://test.org/statics/',
          }),
        ],
      },
      {
        status: 'done',
        publicPath: 'https://test.org/statics/',
        status: 'done',
        chunks: {
          main: [
            {
              publicPath: expect.stringMatching(/^https:\/\/test.org\/statics\/main-[a-z0-9]+.js$/),
            },
          ],
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should overwrite filename when option is set', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    const filename = 'new-stats.json';

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: filename,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: expect.not.toBeEmpty(),
        },
      },
      filename,
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should create intermdiate directory if filename option is set with intermdiate directory', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    const filename = 'data/stats.json';

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: filename,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: expect.not.toBeEmpty(),
        },
      },
      filename,
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should show error when compilation errors', done => {
    const expectErrors = expect.stringMatching(
      /^ModuleNotFoundError: Module not found: Error: (Can't resolve|Cannot resolve module) 'toto' in '?.*?\/fixtures'?$/,
    );
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index-fail.js'),
        output: {
          path: OUTPUT_DIR,
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            publicPath: 'https://test.org/statics/',
          }),
        ],
      },
      {
        status: 'error',
        error: 'ModuleNotFoundError',
        message: expect.stringMatching(
          /^Module not found: Error: (Can't resolve|Cannot resolve module) 'toto' in '?.*?\/fixtures'?$/,
        ),
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should set relative path when option is set', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: [
            {
              name: expect.stringMatching(/^main-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/main-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)main-[a-z0-9]+.js$/),
            },
          ],
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should show dependant files when webpack splitChunk options is used', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: {
          app1: path.resolve(__dirname, 'fixtures', 'app1.js'),
          app2: path.resolve(__dirname, 'fixtures', 'app2.js'),
        },
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
              vendors: {
                name: 'vendors',
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                chunks: 'initial',
              },
              commons: {
                name: 'commons',
                test: /[\\/]?commons/,
                enforce: true,
                priority: -20,
                chunks: 'all',
                reuseExistingChunk: true,
              },
              default: {
                name: 'shared',
                reuseExistingChunk: true,
              },
            },
          },
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          app1: [
            {
              name: expect.stringMatching(/^vendors-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/vendors-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)vendors-[a-z0-9]+.js$/),
            },
            {
              name: expect.stringMatching(/^commons-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/commons-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)commons-[a-z0-9]+.js$/),
            },
            {
              name: expect.stringMatching(/^app1-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/app1-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)app1-[a-z0-9]+.js$/),
            },
          ],
          app2: [
            {
              name: expect.stringMatching(/^vendors-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/vendors-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)vendors-[a-z0-9]+.js$/),
            },
            {
              name: expect.stringMatching(/^commons-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/commons-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)commons-[a-z0-9]+.js$/),
            },
            {
              name: expect.stringMatching(/^app2-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/app2-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)app2-[a-z0-9]+.js$/),
            },
          ],
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should show dependant files when webpack integrity options is used', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack4WarningMessage();

    testPlugin(
      {
        context: __dirname,
        entry: {
          app1: path.resolve(__dirname, 'fixtures', 'app1.js'),
          appWithAssets: path.resolve(__dirname, 'fixtures', 'appWithAssets.js'),
        },
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: '[name]-[hash].js',
          publicPath: 'http://localhost:3000/assets/bundles/',
        },
        module: {
          rules: [{ test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] }],
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
              vendors: {
                name: 'vendors',
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                chunks: 'initial',
              },
              commons: {
                name: 'commons',
                test: /[\\/]?commons/,
                enforce: true,
                priority: -20,
                chunks: 'all',
                reuseExistingChunk: true,
              },
              default: {
                name: 'shared',
                reuseExistingChunk: true,
              },
            },
          },
        },
        plugins: [
          new MiniCssExtractPlugin({ filename: 'styles-[hash].css' }),
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
            integrity: true,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          app1: [
            {
              name: expect.stringMatching(/^vendors-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/vendors-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)vendors-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
            {
              name: expect.stringMatching(/^commons-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/commons-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)commons-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
            {
              name: expect.stringMatching(/^app1-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/app1-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)app1-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
          ],
          appWithAssets: [
            {
              name: expect.stringMatching(/^vendors-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/vendors-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)vendors-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
            {
              name: expect.stringMatching(/^commons-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/commons-[a-z0-9]+.js$/),
              path: expect.stringMatching(/^js(\/||\\)commons-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
            {
              name: expect.stringMatching(/^styles-[a-z0-9]+.css$/),
              publicPath: expect.stringMatching(/^http:\/\/localhost:3000\/assets\/bundles\/styles-[a-z0-9]+.css$/),
              path: expect.stringMatching(/^js(\/||\\)styles-[a-z0-9]+.css$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
            {
              name: expect.stringMatching(/^appWithAssets-[a-z0-9]+.js$/),
              publicPath: expect.stringMatching(
                /^http:\/\/localhost:3000\/assets\/bundles\/appWithAssets-[a-z0-9]+.js$/,
              ),
              path: expect.stringMatching(/^js(\/||\\)appWithAssets-[a-z0-9]+.js$/),
              integrity: expect.stringMatching(/sha256-\S+ sha384-\S+ sha512-\S+/),
            },
          ],
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });
});
