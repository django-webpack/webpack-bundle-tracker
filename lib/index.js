// @ts-check
/** @typedef {import("lodash.defaults")} defaults */
/** @typedef {import("lodash.assign")} assign */
/** @typedef {import("lodash.get")} get */
/** @typedef {import("webpack").Compiler} Compiler */
/** @typedef {import("webpack").AssetEmittedInfo} AssetEmittedInfo */
/** @typedef {import("webpack").Stats} Stats */
/** @typedef {import("webpack").compilation.Compilation} Compilation */
/** @typedef {import("webpack").compilation.ContextModuleFactory} ContextModuleFactory */
/** @typedef {import("webpack").ChunkData} ChunkData  */
/** @typedef {import("../typings").Contents} Contents */
/** @typedef {import("../typings").Options} Options */
/** @typedef {Contents['assets']} ContentsAssets */
/** @typedef {ContentsAssets[keyof ContentsAssets]} ContentsAssetsValue */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const defaults = require('lodash.defaults');
const assign = require('lodash.assign');
const get = require('lodash.get');
const each = require('lodash.foreach');
const fromPairs = require('lodash.frompairs');
const toPairs = require('lodash.topairs');
const stripAnsi = require('./utils/stripAnsi');

function getAssetPath(compilation, name) {
  return path.join(compilation.getPath(compilation.compiler.outputPath), name.split('?')[0]);
}

/**
 * Merges the provided objects, ensuring that the resulting object has its properties in sorted order.
 * @template T
 * @param {T} obj1
 * @param {Partial<T> | undefined} obj2
 * @returns {T}
 */
function mergeObjects(obj1, obj2) {
  const mergedObj = assign({}, obj1, obj2);
  const sortedPairs = toPairs(mergedObj).sort((e1, e2) => e1[0].localeCompare(e2[0]));
  // @ts-ignore: 2322 The Lodash typedefs aren't smart enough to be able to tell TS that we're
  // regenerating the object from the original key-value pairs.
  return fromPairs(sortedPairs);
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
    this.contents = {
      status: 'initialization',
      assets: {},
      chunks: {},
    };
    this.name = 'BundleTrackerPlugin';
    /** @type {Contents} */
    this._iter_output = { status: 'compile', assets: {}, chunks: {} }

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
    this.options = defaults({}, this.options, {
      path: get(compiler.options, 'output.path', process.cwd()),
      publicPath: get(compiler.options, 'output.publicPath', ''),
      filename: 'webpack-stats.json',
      logTime: false,
      relativePath: false,
      integrity: false,
      indent: 2,
      // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
      integrityHashes: ['sha256', 'sha384', 'sha512'],
    });

    if (
      typeof this.options.filename === 'string' &&
      this.options.filename.includes('/')
    ) {
      throw Error(
        "The `filename` shouldn't include a `/`. Please use the `path` parameter to " +
          "build the directory path and use `filename` only for the file's name itself.\n" +
          'TIP: you can use `path.join` to build the directory path in your config file.',
      );
    }

    // Set output directories
    this.outputChunkDir = path.resolve(get(compiler.options, 'output.path', process.cwd()));
    // @ts-ignore: TS2345 this.options.path can't be undefined here because we set a default value above
    // @ts-ignore: TS2345 this.options.filename can't be undefined here because we set a default value above
    this.outputTrackerFile = path.resolve(path.join(this.options.path, this.options.filename));
    this.outputTrackerDir = path.dirname(this.outputTrackerFile);

    return this;
  }
  /**
   * Write bundle tracker stats file, merging the existing content with
   * the output from the latest compilation results, back to the
   * `this.contents` variable.
   */
  _writeOutput() {
    assign(this.contents, this._iter_output, {
      assets: mergeObjects(this.contents.assets, this._iter_output.assets),
      chunks: mergeObjects(this.contents.chunks, this._iter_output.chunks),
    });

    if (this.options.publicPath) {
      this.contents.publicPath = this.options.publicPath;
    }

    fs.mkdirSync(this.outputTrackerDir, { recursive: true, mode: 0o755 });
    fs.writeFileSync(this.outputTrackerFile, JSON.stringify(this.contents, null, this.options.indent));
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
   * @param {Compiler} compiler
   */
  _handleCompile(compiler) {
    this._iter_output = { status: 'compile', assets: {}, chunks: {} }
    this._writeOutput();
  }

  /**
   * Handle compile hook
   * @param {string} compiledFile
   * @param {AssetEmittedInfo} compiledDetails
   */
  _handleAssetEmitted(compiledFile, compiledDetails) {
    /** @type {ContentsAssetsValue} */
    const thisFile = {
      name: compiledFile,
      path: compiledDetails.targetPath
    }
    if (this.options.integrity === true) {
      thisFile.integrity = this._computeIntegrity(compiledDetails.content);
    }
    if (this.options.publicPath) {
      if (this.options.publicPath === 'auto') {
        thisFile.publicPath = 'auto';
      } else {
        thisFile.publicPath = this.options.publicPath + compiledFile;
      }
    }
    if (this.options.relativePath === true) {
      thisFile.path = path.relative(this.outputChunkDir, thisFile.path);
    }
    /** @type {Compilation} */
    const compilation = compiledDetails.compilation
    // @ts-ignore: TS2339: Property 'assetsInfo' does not exist on type 'Compilation'.
    if (compilation.assetsInfo) {
      // @ts-ignore: TS2339: Property 'assetsInfo' does not exist on type 'Compilation'.
      thisFile.sourceFilename =
        compilation.assetsInfo.get(compiledFile).sourceFilename;
    }
    this._iter_output.assets[compiledFile] = thisFile
  }

  /**
   * Handle compile hook
   * @param {Compiler} compiler
   * @param {Stats} stats
   */
  _handleDone(compiler, stats) {
    if (stats.hasErrors()) {
      const findError = compilation => {
        if (compilation.errors.length > 0) {
          return compilation.errors[0];
        }
        return compilation.children.find(child => findError(child));
      };
      const error = findError(stats.compilation);
      this._iter_output = {
        status: 'error',
        error: get(error, 'name', 'unknown-error'),
        message: stripAnsi(error['message']),
        assets: {}, chunks: {}
      }
      this._writeOutput();

      return;
    }
    each(stats.compilation.chunkGroups, chunkGroup => {
      if (!chunkGroup.isInitial()) return;
      this._iter_output.chunks[chunkGroup.name] = chunkGroup.getFiles();
    });

    if (this.options.logTime === true) {
      this._iter_output.startTime = stats.startTime;
      this._iter_output.endTime = stats.endTime;
    }
    this._iter_output.status = 'done'
    this._writeOutput();
  }

  /**
   * Method called by webpack to apply plugin hook
   * @param {Compiler} compiler
   */
  apply(compiler) {
    this._setParamsFromCompiler(compiler);

    // In order of hook calls:
    compiler.hooks.compile.tap(this.name, this._handleCompile.bind(this, compiler));
    compiler.hooks.assetEmitted.tap(this.name, this._handleAssetEmitted.bind(this));
    compiler.hooks.done.tap(this.name, this._handleDone.bind(this, compiler));
  }
}

module.exports = BundleTrackerPlugin;
