// @ts-check
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").compilation.Compilation} Compilation */
/** @typedef {import("webpack").compilation.ContextModuleFactory} ContextModuleFactory */
/** @typedef {import("webpack").ChunkData} ChunkData  */
/** @typedef {import("../typings").Contents} Contents */
/** @typedef {import("../typings").Options} Options */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const stripAnsi = require('./utils/stripAnsi');

function getAssetPath(compilation, name) {
  return path.join(compilation.getPath(compilation.compiler.outputPath), name.split('?')[0]);
}

function getSource(compilation, name) {
  const path = getAssetPath(compilation, name);
  return fs.readFileSync(path, { encoding: 'utf-8' });
}

/**
 * Merges the provided objects, ensuring that the resulting object has its properties in sorted order.
 * @template T
 * @param {T} obj1 First object to merge.
 * @param {Partial<T> | undefined} obj2 Second object to merge, can be undefined.
 * @returns {*} A new object containing the merged properties of obj1 and obj2, with keys sorted.
 */
function mergeObjectsAndSortKeys(obj1, obj2) {
  const mergedObj = Object.assign({}, obj1, obj2);

  // Generates a new object with the same keys and values as mergedObj but in sorted order
  const sortedKeys = Object.keys(mergedObj).sort();
  return sortedKeys.reduce((acc, key) => {
    acc[key] = mergedObj[key];
    return acc;
  }, {});
}

class BundleTrackerPlugin {
  /**
   * Track assets file location per bundle
   * @param {Options} options
   */
  constructor(options) {
    /** @type {Options} */
    this.options = options;
    /** @type {Contents} */
    this.output = {
      status: 'initialization',
      assets: {},
      chunks: {},
    };
    this.name = 'BundleTrackerPlugin';

    this.assets = {};
    this.outputChunkDir = '';
    this.outputTrackerFile = '';
    this.outputTrackerDir = '';
  }
  /**
   * Setup parameter from compiler data
   * @param {Compiler} compiler
   * @returns this
   */
  _setParamsFromCompiler(compiler) {
    this.options = Object.assign(
      {},
      {
        path: compiler.options.output?.path ?? process.cwd(),
        publicPath: compiler.options.output?.publicPath ?? '',
        filename: 'webpack-stats.json',
        logTime: false,
        relativePath: false,
        integrity: false,
        indent: 2,
        // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
        integrityHashes: ['sha256', 'sha384', 'sha512'],
      },
      this.options,
    );

    if (this.options.filename?.includes('/')) {
      throw Error(
        "The `filename` shouldn't include a `/`. Please use the `path` parameter to " +
          "build the directory path and use `filename` only for the file's name itself.\n" +
          'TIP: you can use `path.join` to build the directory path in your config file.',
      );
    }

    // Set output directories
    const outputPath = compiler.options.output?.path ?? process.cwd();
    this.outputChunkDir = path.resolve(outputPath);

    // @ts-ignore: TS2345 this.options.path can't be undefined here because we set a default value above
    // @ts-ignore: TS2345 this.options.filename can't be undefined here because we set a default value above
    this.outputTrackerFile = path.resolve(path.join(this.options.path, this.options.filename));
    this.outputTrackerDir = path.dirname(this.outputTrackerFile);

    return this;
  }
  /**
   * Write bundle tracker stats file
   */
  _writeOutput(contents) {
    Object.assign(this.output, contents, {
      assets: mergeObjectsAndSortKeys(this.output.assets, contents.assets),
      chunks: mergeObjectsAndSortKeys(this.output.chunks, contents.chunks),
    });

    if (this.options.publicPath) {
      this.output.publicPath = this.options.publicPath;
    }

    fs.mkdirSync(this.outputTrackerDir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(this.outputTrackerFile, JSON.stringify(this.output, null, this.options.indent));
  }
  /**
   * Compute hash for a content
   * @param {string} content
   */
  _computeIntegrity(content) {
    // @ts-ignore: TS2532 this.options.integrityHashes can't be undefined here because
    // we set a default value on _setParamsFromCompiler
    return this.options.integrityHashes
      .map(algorithm => {
        const hash = crypto
          .createHash(algorithm)
          .update(content, 'utf8')
          .digest('base64');

        return `${algorithm}-${hash}`;
      })
      .join(' ');
  }
  /**
   * Handle compile hook
   */
  _handleCompile() {
    this._writeOutput({ status: 'compile' });
  }

  /**
   * Hook to inject the webpack compilation object
   */
  _handleThisCompilation(compilation) {
    this._compilation = compilation;
  }

  /**
   * Hook to handle each compiled asset and set their
   * info into the output object
   */
  _handleAssetEmitted(assetName) {
    const fileInfo = {
      name: assetName,
      path: getAssetPath(this._compilation, assetName),
    };

    if (this.options.integrity === true) {
      fileInfo.integrity = this._computeIntegrity(getSource(this._compilation, assetName));
    }

    if (this.options.publicPath) {
      if (this.options.publicPath === 'auto') {
        fileInfo.publicPath = 'auto';
      } else {
        fileInfo.publicPath = this.options.publicPath + assetName;
      }
    }

    if (this.options.relativePath === true) {
      fileInfo.path = path.relative(this.outputChunkDir, fileInfo.path);
    }

    // @ts-ignore: TS2339: Property 'assetsInfo' does not exist on type 'Compilation'.
    if (this._compilation.assetsInfo) {
      // @ts-ignore: TS2339: Property 'assetsInfo' does not exist on type 'Compilation'.
      fileInfo.sourceFilename = this._compilation.assetsInfo.get(assetName).sourceFilename;
    }

    this.assets[assetName] = fileInfo;
  }

  /**
   * Handle done hook and write output file
   * @param {Stats} stats
   */
  _handleDone(stats) {
    if (stats.hasErrors()) {
      const findError = compilation => {
        if (compilation.errors.length > 0) {
          return compilation.errors[0];
        }
        return compilation.children.find(child => findError(child));
      };
      const error = findError(stats.compilation);
      this._writeOutput({
        status: 'error',
        error: error?.name ?? 'unknown-error',
        message: stripAnsi(error['message']),
      });
      return;
    }

    const chunks = {};
    stats.compilation.chunkGroups.forEach(chunkGroup => {
      if (!chunkGroup.isInitial()) return;
      chunks[chunkGroup.name] = chunkGroup.getFiles();
    });

    const output = { status: 'done', chunks, assets: this.assets };
    if (this.options.logTime === true) {
      output.startTime = stats.startTime;
      output.endTime = stats.endTime;
    }
    this._writeOutput(output);
  }

  /**
   * Method called by webpack to apply plugin hook
   * @param {Compiler} compiler
   */
  apply(compiler) {
    this._setParamsFromCompiler(compiler);
    compiler.hooks.compile.tap(this.name, this._handleCompile.bind(this));
    // The thisCompilation hook is required here because webpack4 does not properly
    // inject the stats object with the compilation data into the assetEmitted hook
    compiler.hooks.thisCompilation.tap(this.name, this._handleThisCompilation.bind(this));
    compiler.hooks.assetEmitted.tap(this.name, this._handleAssetEmitted.bind(this));
    compiler.hooks.done.tap(this.name, this._handleDone.bind(this));
  }
}

module.exports = BundleTrackerPlugin;
