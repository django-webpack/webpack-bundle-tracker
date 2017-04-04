# webpack-bundle-tracker

[![Join the chat at https://gitter.im/owais/webpack-bundle-tracker](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/owais/webpack-bundle-tracker?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


Spits out some stats about webpack compilation process to a file.

<br>

#### Install

```bash
npm install --save-dev webpack-bundle-tracker
```

<br>

#### Usage
```javascript
var BundleTracker  = require('webpack-bundle-tracker');
module.exports = {
        context: __dirname,
    entry: {
      app: ['./app']
    },

    output: {
        path: require("path").resolve('./assets/bundles/'),
        filename: "[name]-[hash].js",
        publicPath: 'http://localhost:3000/assets/bundles/',
    },

    plugins: [
      new BundleTracker({path: __dirname, filename: './assets/webpack-stats.json'})
    ]
}
```

`./assets/webpack-stats.json` will look like,

```json
{
  "status":"done",
  "chunks":{
    "app":[{
      "name":"app-0828904584990b611fb8.js",
      "publicPath":"http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path":"/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
    }]
  }
}
```

In case webpack is still compiling, it'll look like,


```json
{
  "status":"compiling",
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
```
{
  "status":"done",
  "chunks":{
   "app":[{
      "name":"app-0828904584990b611fb8.js",
      "publicPath":"http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
      "path":"/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
    }]
  },
  "startTime":1440535322138,
  "endTime":1440535326804
}
```

To track all assets output by webpack, pass the `trackAssets: true` option to the plugin:

javascript
var BundleTracker  = require('webpack-bundle-tracker');
module.exports = {
        context: __dirname,
    entry: {
      app: ['./app']
    },

    output: {
        path: require("path").resolve('./assets/bundles/'),
        filename: "[name]-[hash].js",
        publicPath: 'http://localhost:3000/assets/bundles/',
    },

    plugins: [
      new BundleTracker({
        path: __dirname,
        filename: './assets/webpack-stats.json',
        trackAssets: true,
        assetsChunkName: 'assets' // defaults to this
      })
    ]
}
```

and the output will look like:

```json
{
  "status":"done",
  "chunks":{
    "app":[
      {
        "name":"app-0828904584990b611fb8.js",
        "publicPath":"http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
        "path":"/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
      }
    ],
    "assets":[
      {
        "name":"app-0828904584990b611fb8.js",
        "publicPath":"http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js",
        "path":"/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js"
      },
      {
        "name":"app-0828904584990b611fb8.js.gz",
        "publicPath":"http://localhost:3000/assets/bundles/app-0828904584990b611fb8.js.gz",
        "path":"/home/user/project-root/assets/bundles/app-0828904584990b611fb8.js.gz"
      },
      {
        "name":"app-eef39b47d0d3ee.css",
        "publicPath":"http://localhost:3000/assets/bundles/app-eef39b47d0d3ee.css",
        "path":"/home/user/project-root/assets/bundles/app-eef39b47d0d3ee.css"
      },
      {
        "name":912ec66d7572ff821749319396470bde.svg",
        "publicPath":"/static/bundles/912ec66d7572ff821749319396470bde.svg",
        "path":"/Users/ryanar/Code/rit-das-pdp/pd/static/bundles/912ec66d7572ff821749319396470bde.svg"
      }
    ]
  }
}
```

This option allows all assets to be tracked and accessed but can result in much larger `.json` files.

By default, the output JSON will not be indented. To increase readability, you can use the `indent`
option to make the output legible. By default it is off. The value that is set here will be directly
passed to the `space` parameter in `JSON.stringify`. More information can be found here:
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
