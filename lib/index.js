// @ts-check
/** @typedef {import("lodash.defaults")} defaults */
/** @typedef {import("lodash.assign")} assign */
/** @typedef {import("lodash.get")} get */
/** @typedef {import("webpack").Compiler} Compiler4 */
/** @typedef {Compiler4['hooks']['assetEmitted']} assetEmitted4 */
/** @typedef {import("webpack").Stats} Stats4 */
/** @typedef {import("webpack").compilation.Compilation} Compilation4 */
/** @typedef {import("webpack").ChunkData} ChunkData4  */
/** @typedef {import("webpack5").Compiler} Compiler5 */
/** @typedef {import("webpack5").AssetEmittedInfo} AssetEmittedInfo5 */
/** @typedef {import("webpack5").Compilation} Compilation5 */
/** @typedef {Compiler5['hooks']['assetEmitted']} assetEmitted5 */
/** @typedef {import("../typings").Contents} Contents */
/** @typedef {import("../typings").ComputedOpts} ComputedOpts */
/** @typedef {import("../typings").Options} Options */
/** @typedef {Contents['assets']} ContentsAssets */
/** @typedef {ContentsAssets[keyof ContentsAssets]} ContentsAssetsValue */
/** @typedef {Compilation4 | Compilation5} Compilation4or5 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const assign = require('lodash.assign')
const get = require('lodash.get')
const each = require('lodash.foreach')
const fromPairs = require('lodash.frompairs')
const toPairs = require('lodash.topairs')
const stripAnsi = require('./utils/stripAnsi')

/**
 * @param {Compilation4or5} compilation
 * @param {string} name
 * @returns {string}
 */
function getAssetPath(compilation, name) {
  return path.join(
    compilation.getPath(compilation.compiler.outputPath, {}),
    name.split('?')[0])
}

/**
 * Merges the provided objects, ensuring that the resulting object has its properties in sorted order.
 * @template T
 * @param {T} obj1
 * @param {Partial<T> | undefined} obj2
 * @returns {T}
 */
function mergeObjects(obj1, obj2) {
  const mergedObj = assign({}, obj1, obj2)
  const sortedPairs = toPairs(mergedObj).sort(
    (e1, e2) => e1[0].localeCompare(e2[0]))
  // @ts-expect-error: 2322
  // The Lodash typedefs aren't smart enough to be able to tell TS that we're
  // regenerating the object from the original key-value pairs.
  return fromPairs(sortedPairs)
}
/**
 * @property {Compilation4or5} _compilation
 */

class BundleTrackerPlugin {
  /**
   * Track assets file location per bundle
   * @param {Options} options
   */
  constructor(options) {
    /** @type {Options} */
    this.options = options
    /** @type {Contents} */
    this.contents = {
      status: 'initialization',
      assets: {},
      chunks: {},
    }
    this.name = 'BundleTrackerPlugin'
    /** @type {Contents} */
    this._iter_output = { status: 'compile', assets: {}, chunks: {} }
  }

  /**
   * Setup module options from compiler data
   * @param {Compiler4} compiler
   * @returns ComputedOpts
   */
  _getComputedOptions(compiler) {
    const opts = this.options
    const config = {
      path: opts.path || get(compiler.options, 'output.path', process.cwd()),
      filename: opts.filename || 'webpack-stats.json',
      publicPath:
        opts.publicPath || get(compiler.options, 'output.publicPath', ''),
      logTime: opts.logTime || false,
      relativePath: opts.relativePath || false,
      indent: opts.indent || 2,
      integrity: opts.integrity || false,
      // https://www.w3.org/TR/SRI/#cryptographic-hash-functions
      integrityHashes: opts.integrityHashes || ['sha256', 'sha384', 'sha512'],
      outputChunkDir:
        path.resolve(get(compiler.options, 'output.path', process.cwd())),
    }
    if (config.filename.includes('/'))
      throw Error(
        'The `filename` shouldn\'t include a `/`. Please use the `path` ' +
        'parameter to build the directory path and use `filename` only for ' +
        'the file\'s name itself.\nTIP: you can use `path.join` to build the ' +
        'directory path in your config file.')
    const outputTrackerFile =
      path.resolve(path.join(config.path, config.filename))
    /** @type {ComputedOpts} */
    const computedOpts = Object.assign(config, {
      outputTrackerFile,
      outputTrackerDir: path.dirname(outputTrackerFile)
    })
    return computedOpts
  }

  /**
   * Write bundle tracker stats file, merging the existing content with
   * the output from the latest compilation results, back to the
   * `this.contents` variable.
   * @param {ComputedOpts} computedOpts
   */
  _writeOutput(computedOpts) {
    assign(this.contents, this._iter_output, {
      assets: mergeObjects(this.contents.assets, this._iter_output.assets),
      chunks: mergeObjects(this.contents.chunks, this._iter_output.chunks),
    })

    if (computedOpts.publicPath)
      this.contents.publicPath = computedOpts.publicPath

    fs.mkdirSync(
      computedOpts.outputTrackerDir,
      { recursive: true, mode: 0o755 })
    fs.writeFileSync(
      computedOpts.outputTrackerFile,
      JSON.stringify(this.contents, null, computedOpts.indent))
  }

  /**
   * Compute hash for a content
   * @param {Buffer | string} content
   * @param {ComputedOpts} computedOpts
   */
  _computeIntegrity(content, computedOpts) {
    return computedOpts.integrityHashes
      .map(algorithm => {
        const hash = crypto.createHash(algorithm)
        if (typeof content === 'string')
          hash.update(content, 'utf8')
        else
          hash.update(content)
        return `${algorithm}-${hash.digest('base64')}`
      })
      .join(' ')
  }

  /**
   * Handle compile hook
   * @param {Compiler4} compiler
   * @param {ComputedOpts} computedOpts
   */
  _handleCompile(compiler, computedOpts) {
    this._iter_output = { status: 'compile', assets: {}, chunks: {} }
    this._writeOutput(computedOpts)
  }

  /**
   * Handle compile hook
   * @param {ComputedOpts} computedOpts
   * @param {string} compiledFile
   * @param {AssetEmittedInfo5 | string} detailsOrContent
   */
  _handleAssetEmitted(computedOpts, compiledFile, detailsOrContent) {
    /** @type {Compilation4or5} */
    let compilation
    let content
    let targetPath
    if (typeof detailsOrContent === 'string') {
      // Webpack 4
      if (!this._compilation)
        throw Error('_handleAssetEmitted needs the Compilation object.')
      compilation = this._compilation
      content = detailsOrContent
      targetPath = getAssetPath(compilation, compiledFile)
    } else {
      // Webpack 5
      compilation = detailsOrContent.compilation
      content = detailsOrContent.content
      targetPath = detailsOrContent.targetPath
    }
    /** @type {ContentsAssetsValue} */
    const thisFile = {
      name: compiledFile,
      path: targetPath
    }
    if (computedOpts.integrity === true)
      thisFile.integrity =
        this._computeIntegrity(content, computedOpts)
    if (computedOpts.publicPath) {
      if (computedOpts.publicPath === 'auto') {
        thisFile.publicPath = 'auto'
      } else {
        thisFile.publicPath = computedOpts.publicPath + compiledFile
      }
    }
    if (computedOpts.relativePath === true) {
      thisFile.path = path.relative(computedOpts.outputChunkDir, thisFile.path)
    }
    const getAssetResponse = compilation.getAsset(compiledFile)
    if (
      getAssetResponse?.info &&
      getAssetResponse?.info &&
      'sourceFilename' in getAssetResponse.info &&
      getAssetResponse.info.sourceFilename
    ) thisFile.sourceFilename = getAssetResponse.info.sourceFilename

    this._iter_output.assets[compiledFile] = thisFile
  }

  /**
   * Handle compile hook
   * @param {Compiler4} compiler
   * @param {ComputedOpts} computedOpts
   * @param {Stats4} stats
   */
  _handleDone(compiler, computedOpts, stats) {
    if (stats.hasErrors()) {
      const findError = (
      /** @type {Compilation4or5} */ compilation
      ) => {
        if (compilation.errors.length > 0) {
          return compilation.errors[0]
        }
        return compilation.children.find(child => findError(child))
      }
      const error = findError(stats.compilation)
      this._iter_output = {
        status: 'error',
        error: get(error, 'name', 'unknown-error'),
        message: stripAnsi(error['message']),
        assets: {}, chunks: {}
      }
      this._writeOutput(computedOpts)

      return
    }
    each(stats.compilation.chunkGroups, chunkGroup => {
      if (!chunkGroup.isInitial()) return
      this._iter_output.chunks[chunkGroup.name] = chunkGroup.getFiles()
    })

    if (computedOpts.logTime === true) {
      this._iter_output.startTime = stats.startTime
      this._iter_output.endTime = stats.endTime
    }
    this._iter_output.status = 'done'
    this._writeOutput(computedOpts)
  }

  /**
   * Set the compilation object (for the webpack4 case)
   * @param {Compilation4or5} compilation
   */
  _handleThisCompilation(compilation) {
    this._compilation = compilation
  }

  /**
   * Method called by webpack to apply plugin hook
   * @param {Compiler4} compiler
   */
  apply(compiler) {
    const computedOpts = this._getComputedOptions(compiler)
    // this._setParamsFromCompiler(compiler)

    // In order of hook calls:
    compiler.hooks.compile
      .tap(this.name, this._handleCompile.bind(this, compiler, computedOpts))
    compiler.hooks.thisCompilation
      .tap(this.name, this._handleThisCompilation.bind(this))
    // Webpack 4 or 5, who knows at this point
    /** @type {assetEmitted4 | assetEmitted5} */
    const assetEmitted = compiler.hooks.assetEmitted
    assetEmitted
      .tap(this.name, this._handleAssetEmitted.bind(this, computedOpts))
    compiler.hooks.done
      .tap(this.name, this._handleDone.bind(this, compiler, computedOpts))
  }
}

module.exports = BundleTrackerPlugin
