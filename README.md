# Webpack Bundle Tracker [![Join the chat at https://gitter.im/owais/webpack-bundle-tracker](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/owais/webpack-bundle-tracker?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![master build status](https://circleci.com/gh/django-webpack/webpack-bundle-tracker.svg?style=svg)](https://circleci.com/gh/django-webpack/webpack-bundle-tracker)

Spits out some stats about webpack compilation process to a file.

## Install

```bash
npm install --save-dev webpack-bundle-tracker
```

## Compatibility

This project is compatible with NodeJS versions 12 and up.

## Migrating from version 1.x.y to 2.x.y
Starting on version 2.0.0, when creating a new instance of `BundleTracker`, the usage of the `path` parameter has been fixed and it's now being used to generate the output path for the stats file, together with the `filename` parameter. On version 2.0.0, if the `path` parameter is ommited from the constuctor call, it will use its default value and may end up placing the stats file inside an incorrect directory. To avoid that, when migrating, double-check if the file placement is as expected. The usage of these parameters is documented [here](#usage) and [here](#options).

## Usage

```javascript
var BundleTracker = require('webpack-bundle-tracker');
module.exports = {
  context: __dirname,
  entry: {
    app: ['./app'],
  },

  output: {
    path: require('path').resolve('./assets/bundles/'),
    filename: '[name]-[hash].js',
    publicPath: 'http://localhost:3000/assets/bundles/',
  },

  plugins: [
    new BundleTracker({
      path: __dirname,
      filename: 'assets/webpack-stats.json',
    }),
  ],
};
```

The `webpack-stats.json` file will look like,

```json
{
  "status": "done",
  "chunks": {
    "app": ["app-0828904584990b611fb8.js"]
  },
  "assets": {
    "app-0828904584990b611fb8.js": {
      "name": "app-0828904584990b611fb8.js",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path": "/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
    }
  }
}
```

In case webpack is still compiling, it'll look like,

```json
{
  "status": "compile"
}
```

And errors will look like,

```json
{
  "status": "error",
  "file": "/path/to/file/that/caused/the/error",
  "error": "ErrorName",
  "message": "ErrorMessage"
}
```

`ErrorMessage` shows the line and column that caused the error.

And in case `logTime` option is set to `true`, the output will look like,

```json
{
  "status": "done",
  "chunks": {
    "app": [
      "app-0828904584990b611fb8.js"
    ]
  },
  "assets": {
    "app-0828904584990b611fb8.js": {
      "name": "app-0828904584990b611fb8.js",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path": "/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
    }
  },
  "startTime": 1440535322138,
  "endTime": 1440535326804
}
```

And in case `relativePath` option is set to `true`, the output will look like,

```json
{
  "status": "done",
  "chunks": {
    "app": ["app-0828904584990b611fb8.js"]
  },
  "assets": {
    "app-0828904584990b611fb8.js": {
      "name": "app-0828904584990b611fb8.js",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path": "app-0828904584990b611fb8.js"
    }
  }
}
```

And in case `integrity` option is set to `true`, the output will look like,

```json
{
  "status": "done",
  "chunks": {
    "app": ["app-0828904584990b611fb8.js"]
  },
  "assets": {
    "app-0828904584990b611fb8.js": {
      "name": "app-0828904584990b611fb8.js",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path": "app-0828904584990b611fb8.js",
      "integrity": "sha256-yAIefNWsF0IfxalAlLNngdY0t3J1h4IzZLzcJEn/FTM= sha384-QmiRCOdQx6MVC721liFMbJjud6Kr5ryT1vhHI5htzftpzoI1P3IlBqbpg5AHjbBv sha512-kbLjakids0Z2vvrOrtV7s2FUvKcgM3bg0WQwuyGvJPE+zVqOL4t0UvWkeUzz5z2ZrDm0ST/dQjPBJaq7rDB/2Q=="
    }
  }
}
```

And in case of usage of compression plugin for webpack, the output will look like,

```json
{
  "status": "done",
  "chunks": {
    "app": ["app-0828904584990b611fb8.js"]
  },
  "assets": {
    "app-0828904584990b611fb8.js": {
      "name": "app-0828904584990b611fb8.js",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path": "/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
    },
    "app-0828904584990b611fb8.js.br": {
      "name": "app-0828904584990b611fb8.js.br",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js.br",
      "path": "/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js.br"
    },
    "app-0828904584990b611fb8.js.gz": {
      "name": "app-0828904584990b611fb8.js.gz",
      "publicPath": "http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js.gz",
      "path": "/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js.gz"
    }
  }
}
```

By default, the output JSON will not be indented. To increase readability, you can use the `indent`
option to make the output legible. By default it is off. The value that is set here will be directly
passed to the `space` parameter in `JSON.stringify`. More information can be found [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

## Options

| Name              | Type        | Default                          | Description                                                                                                                     |
| ----------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `path`            | `{String}`  | `'.'`                            | Output directory of bundle tracker JSON file.                                                                                   |
| `filename`        | `{String}`  | `'webpack-stats.json'`           | Name of the bundle tracker JSON file.                                                                                           |
| `publicPath`      | `{String}`  | (ignored)                        | Override `output.publicPath` from Webpack config.                                                                               |
| `relativePath`    | `{Boolean}` | `false`                          | Show relative path instead of absolute path for bundles in JSON Tracker file. Path are relative from path of JSON Tracker file. |
| `logTime`         | `{Boolean}` | `false`                          | Output `startTime` and `endTime` properties in bundle tracker JSON file.                                                        |
| `integrity`       | `{Boolean}` | `false`                          | Output `integrity` property for each asset entry.                                                                               |
| `integrityHashes` | `{Array}`   | `['sha256', 'sha384', 'sha512']` | Cryptographic hash functions used to compute integrity for each asset.                                                          |
| `indent`          | `{Integer}` | `undefined`                      | Format resulting JSON file for better readability.                                                                              |
