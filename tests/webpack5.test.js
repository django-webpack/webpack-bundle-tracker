/* eslint-env jest */
'use strict';

const fs = require('fs');
const toPairs = require('lodash.topairs');
const zlib = require('zlib');
const path = require('path');
const rimraf = require('rimraf');
const webpack5 = require('webpack5');

const { OUTPUT_DIR, testPlugin, getWebpack5WarningMessage } = require('./utils.js');

const CompressionPlugin = require('compression-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleTrackerPlugin = require('../lib/index.js');

jest.setTimeout(30000);
process.on('unhandledRejection', r => console.log(r));
process.traceDeprecation = true;

describe('BundleTrackerPlugin bases tests', () => {
  beforeEach(done => {
    rimraf(path.join(OUTPUT_DIR, '*'), done);
  });

  it('It should generate stats for a single entrypoint', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        publicPath: 'http://localhost:3000/assets/',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: OUTPUT_DIR + '/js/main.js',
            publicPath: 'http://localhost:3000/assets/js/main.js',
          },
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
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: 'webpack-stats.json',
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
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: 'webpack-stats.json',
            publicPath: 'https://test.org/statics/',
          }),
        ],
      },
      {
        publicPath: 'https://test.org/statics/',
        status: 'done',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: OUTPUT_DIR + '/js/main.js',
            publicPath: 'https://test.org/statics/js/main.js',
          },
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
    const expectWarnings = getWebpack5WarningMessage();

    const filename = 'new-stats.json';

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: OUTPUT_DIR + '/js/main.js',
            publicPath: 'http://localhost:3000/assets/js/main.js',
          },
        },
      },
      filename,
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should create intermdiate directory if path option is set with intermdiate directory', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    const filename = 'stats.json';

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: path.join(OUTPUT_DIR, 'data'),
            filename,
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: OUTPUT_DIR + '/js/main.js',
            publicPath: 'http://localhost:3000/assets/js/main.js',
          },
        },
      },
      `data/${filename}`,
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('It should show error when compilation errors', done => {
    const expectErrors = expect.stringMatching(
      /^ModuleNotFoundError: Module not found: Error: (Can't resolve|Cannot resolve module) 'toto' in '?.*?\/fixtures'?$/,
    );
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index-fail.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            publicPath: 'https://test.org/statics/',
            filename: 'webpack-stats.json',
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
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: 'js/main.js',
            publicPath: 'http://localhost:3000/assets/js/main.js',
          },
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
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: {
          app1: path.resolve(__dirname, 'fixtures', 'app1.js'),
          app2: path.resolve(__dirname, 'fixtures', 'app2.js'),
        },
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
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
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          app1: ['js/commons.js', 'js/app1.js'],
          app2: ['js/commons.js', 'js/app2.js'],
        },
        assets: {
          'js/app1.js': {
            name: 'js/app1.js',
            path: 'js/app1.js',
            publicPath: 'http://localhost:3000/assets/js/app1.js',
          },
          'js/app2.js': {
            name: 'js/app2.js',
            path: 'js/app2.js',
            publicPath: 'http://localhost:3000/assets/js/app2.js',
          },
          'js/commons.js': {
            name: 'js/commons.js',
            path: 'js/commons.js',
            publicPath: 'http://localhost:3000/assets/js/commons.js',
          },
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
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: {
          app1: path.resolve(__dirname, 'fixtures', 'app1.js'),
          appWithAssets: path.resolve(__dirname, 'fixtures', 'appWithAssets.js'),
        },
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
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
          new MiniCssExtractPlugin({ filename: 'styles.css' }),
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
            integrity: true,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          app1: ['js/commons.js', 'js/app1.js'],
          appWithAssets: ['js/commons.js', 'styles.css', 'js/appWithAssets.js'],
        },
        publicPath: 'http://localhost:3000/assets/',
        assets: {
          'js/commons.js': {
            name: 'js/commons.js',
            path: 'js/commons.js',
            integrity: expect.stringMatching(/^^sha256-[\w+=/]+ sha384-[\w+=/]+ sha512-[\w+=/]+$/),
            publicPath: 'http://localhost:3000/assets/js/commons.js',
          },
          'js/app1.js': {
            name: 'js/app1.js',
            path: 'js/app1.js',
            integrity: expect.stringMatching(/^^sha256-[\w+=/]+ sha384-[\w+=/]+ sha512-[\w+=/]+$/),
            publicPath: 'http://localhost:3000/assets/js/app1.js',
          },
          'styles.css': {
            name: 'styles.css',
            path: 'styles.css',
            integrity: expect.stringMatching(/^^sha256-[\w+=/]+ sha384-[\w+=/]+ sha512-[\w+=/]+$/),
            publicPath: 'http://localhost:3000/assets/styles.css',
          },
          'js/appWithAssets.js': {
            name: 'js/appWithAssets.js',
            path: 'js/appWithAssets.js',
            integrity: expect.stringMatching(/^^sha256-[\w+=/]+ sha384-[\w+=/]+ sha512-[\w+=/]+$/),
            publicPath: 'http://localhost:3000/assets/js/appWithAssets.js',
          },
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });
  it('It should show compressed assets', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: {
          app1: path.resolve(__dirname, 'fixtures', 'app1.js'),
          appWithAssets: path.resolve(__dirname, 'fixtures', 'appWithAssets.js'),
        },
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
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
          new MiniCssExtractPlugin({ filename: 'css/[name].css' }),
          new CompressionPlugin({
            filename: '[path][base].gz[query]',
            test: /\.(js|css)$/,
            threshold: 1,
            minRatio: 1, // Compress all files
            deleteOriginalAssets: false,
          }),
          new CompressionPlugin({
            filename: '[path][base].br[query]',
            algorithm: 'brotliCompress',
            test: /\.(js|css)$/,
            threshold: 1,
            minRatio: 1, // Compress all files
            deleteOriginalAssets: false,
            compressionOptions: {
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
              },
            },
          }),
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        chunks: {
          app1: [expect.stringMatching(/^js\/commons.js$/), expect.stringMatching(/^js\/app1.js$/)],
          appWithAssets: [
            expect.stringMatching(/^js\/commons.js$/),
            expect.stringMatching(/^css\/appWithAssets.css$/),
            expect.stringMatching(/^js\/appWithAssets.js$/),
          ],
        },
        assets: {
          'js/commons.js': {
            name: 'js/commons.js',
            path: 'js/commons.js',
            publicPath: 'http://localhost:3000/assets/js/commons.js',
          },
          'js/app1.js': {
            name: 'js/app1.js',
            path: 'js/app1.js',
            publicPath: 'http://localhost:3000/assets/js/app1.js',
          },
          'css/appWithAssets.css': {
            name: 'css/appWithAssets.css',
            path: 'css/appWithAssets.css',
            publicPath: 'http://localhost:3000/assets/css/appWithAssets.css',
          },
          'js/appWithAssets.js': {
            name: 'js/appWithAssets.js',
            path: 'js/appWithAssets.js',
            publicPath: 'http://localhost:3000/assets/js/appWithAssets.js',
          },
          'js/commons.js.gz': {
            name: 'js/commons.js.gz',
            path: 'js/commons.js.gz',
            publicPath: 'http://localhost:3000/assets/js/commons.js.gz',
          },
          'js/app1.js.gz': {
            name: 'js/app1.js.gz',
            path: 'js/app1.js.gz',
            publicPath: 'http://localhost:3000/assets/js/app1.js.gz',
          },
          'css/appWithAssets.css.gz': {
            name: 'css/appWithAssets.css.gz',
            path: 'css/appWithAssets.css.gz',
            publicPath: 'http://localhost:3000/assets/css/appWithAssets.css.gz',
          },
          'js/appWithAssets.js.gz': {
            name: 'js/appWithAssets.js.gz',
            path: 'js/appWithAssets.js.gz',
            publicPath: 'http://localhost:3000/assets/js/appWithAssets.js.gz',
          },
          'js/commons.js.br': {
            name: 'js/commons.js.br',
            path: 'js/commons.js.br',
            publicPath: 'http://localhost:3000/assets/js/commons.js.br',
          },
          'css/appWithAssets.css.br': {
            name: 'css/appWithAssets.css.br',
            path: 'css/appWithAssets.css.br',
            publicPath: 'http://localhost:3000/assets/css/appWithAssets.css.br',
          },
          'js/app1.js.br': {
            name: 'js/app1.js.br',
            path: 'js/app1.js.br',
            publicPath: 'http://localhost:3000/assets/js/app1.js.br',
          },
          'js/appWithAssets.js.br': {
            name: 'js/appWithAssets.js.br',
            path: 'js/appWithAssets.js.br',
            publicPath: 'http://localhost:3000/assets/js/appWithAssets.js.br',
          },
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it("shows original asset's filepath", done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: {
          appWithAssetResources: path.resolve(__dirname, 'fixtures', 'appWithAssetResources.js'),
        },
        output: {
          assetModuleFilename: 'assets/[name]-[contenthash][ext]',
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        module: {
          rules: [{ test: /\.txt$/, type: 'asset/resource' }],
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        assets: {
          'assets/test-bbf3c94e2a3948c98900.txt': {
            name: 'assets/test-bbf3c94e2a3948c98900.txt',
            path: 'assets/test-bbf3c94e2a3948c98900.txt',
            publicPath: 'http://localhost:3000/assets/assets/test-bbf3c94e2a3948c98900.txt',
            sourceFilename: 'fixtures/assets/resources/test.txt',
          },
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });

  it('correctly merges chunks after multiple runs', done => {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'app1.js'),
      `require(${JSON.stringify(path.resolve(__dirname, 'fixtures', 'commons.js'))});`,
    );
    const compiler = webpack5(
      {
        context: __dirname,
        entry: {
          app1: path.join(OUTPUT_DIR, 'app1.js'),
          app2: path.resolve(__dirname, 'fixtures', 'app2.js'),
        },
        output: {
          path: path.join(OUTPUT_DIR, 'js'),
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
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
            filename: 'webpack-stats.json',
          }),
        ],
      },
      () => {
        // Edit app1.js and rerun the compilation
        fs.writeFileSync(path.join(OUTPUT_DIR, 'app1.js'), '');
        compiler.run(() => {
          const trackerStatsContent = fs.readFileSync(path.join(OUTPUT_DIR, 'webpack-stats.json'), 'utf8');
          const trackerStats = JSON.parse(trackerStatsContent);
          expect(trackerStats.chunks).toMatchObject({
            app1: ['js/app1.js'],
            app2: ['js/commons.js', 'js/app2.js'],
          });
          done();
        });
      },
    );
  });

  it('sorts assets and chunks properties in alphabetical order', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: {
          appZ: path.resolve(__dirname, 'fixtures', 'app1.js'),
          appA: path.resolve(__dirname, 'fixtures', 'appWithAssets.js'),
        },
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'http://localhost:3000/assets/',
        },
        module: {
          rules: [{ test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] }],
        },
        optimization: {
          splitChunks: {
            cacheGroups: {
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
          new MiniCssExtractPlugin({ filename: 'css/[name].css' }),
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            relativePath: true,
            includeParents: true,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        // This object is deliberately left empty because the real test happens below,
        // not in the comparison inside testPlugin.
      },
      'webpack-stats.json',
      () => {
        const statsStr = fs.readFileSync(path.join(OUTPUT_DIR, 'webpack-stats.json'), 'utf8');
        const stats = JSON.parse(statsStr);
        const assetsKeys = toPairs(stats.assets).map(pair => pair[0]);
        const chunksKeys = toPairs(stats.chunks).map(pair => pair[0]);

        expect(assetsKeys).toEqual(['css/appA.css', 'js/75.js', 'js/appA.js', 'js/appZ.js', 'js/commons.js']);
        expect(chunksKeys).toEqual(['appA', 'appZ']);

        done();
      },
      expectErrors,
      expectWarnings,
    );
  });

  it('It should support publicPath: "auto"', done => {
    const expectErrors = null;
    const expectWarnings = getWebpack5WarningMessage();

    testPlugin(
      webpack5,
      {
        context: __dirname,
        entry: path.resolve(__dirname, 'fixtures', 'index.js'),
        output: {
          path: OUTPUT_DIR,
          filename: 'js/[name].js',
          publicPath: 'auto',
        },
        plugins: [
          new BundleTrackerPlugin({
            path: OUTPUT_DIR,
            filename: 'webpack-stats.json',
          }),
        ],
      },
      {
        status: 'done',
        publicPath: 'auto',
        chunks: {
          main: ['js/main.js'],
        },
        assets: {
          'js/main.js': {
            name: 'js/main.js',
            path: OUTPUT_DIR + '/js/main.js',
            publicPath: 'auto',
          },
        },
      },
      'webpack-stats.json',
      done,
      expectErrors,
      expectWarnings,
    );
  });
});
