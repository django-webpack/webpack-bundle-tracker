// @ts-check
/** @typedef {import("lodash.defaults")} defaults */
/** @typedef {import("lodash.assign")} assign */
/** @typedef {import("lodash.get")} get */
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

const defaults = require('lodash.defaults');
const assign = require('lodash.assign');
const get = require('lodash.get');
const each = require('lodash.foreach');
const stripAnsi = require('strip-ansi');

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
      chunks: {},
    };
    this.name = 'BundleTrackerPlugin';

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
      // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
      integrityHashes: ['sha256', 'sha384', 'sha512'],
    });

    // Set output directories
    this.outputChunkDir = path.resolve(get(compiler.options, 'output.path', process.cwd()));
    this.outputTrackerFile = path.resolve(this.options.filename);
    this.outputTrackerDir = path.dirname(this.outputTrackerFile);

    return this;
  }
  /**
   * Write bundle tracker stats file
   *
   * @param {Compiler} compiler
   * @param {Contents} contents
   */
  _writeOutput(compiler, contents) {
    assign(this.contents, contents);

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
    this._writeOutput(compiler, { status: 'compile' });
  }
  /**
   * Handle compile hook
   * @param {Compiler} compiler
   * @param {Stats} stats
   */
  _handleDone(compiler, stats) {
    if (stats.hasErrors()) {
      const error = stats.compilation.errors[0];
      this._writeOutput(compiler, {
        status: 'error',
        error: get(error, 'name', 'unknown-error'),
        message: stripAnsi(error['message']),
      });

      return;
    }

    const output = { status: 'done', assets: {}, chunks: {} };
    each(stats.compilation.assets, (file, assetName) => {
      const fileInfo = {
        name: assetName,
        path: file.existsAt,
      };

      if (this.options.integrity === true) {
        fileInfo.integrity = this._computeIntegrity(file.source());
      }

      if (this.options.publicPath) {
        fileInfo.publicPath = this.options.publicPath + assetName;
      }

      if (this.options.relativePath === true) {
        fileInfo.path = path.relative(this.outputChunkDir, fileInfo.path);
      }

      output.assets[assetName] = fileInfo;
    });
    each(stats.compilation.chunkGroups, chunkGroup => {
      if (!chunkGroup.isInitial()) return;

      output.chunks[chunkGroup.name] = chunkGroup.getFiles();
    });

    if (this.options.logTime === true) {
      output.startTime = stats.startTime;
      output.endTime = stats.endTime;
    }

    this._writeOutput(compiler, output);
  }
  /**
   * Method called by webpack to apply plugin hook
   * @param {Compiler} compiler
   */
  apply(compiler) {
    this._setParamsFromCompiler(compiler);

    compiler.hooks.compile.tap(this.name, this._handleCompile.bind(this, compiler));
    compiler.hooks.done.tap(this.name, this._handleDone.bind(this, compiler));
  }
}

module.exports = BundleTrackerPlugin;
