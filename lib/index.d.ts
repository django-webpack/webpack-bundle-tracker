import { Compiler } from 'webpack';

export = Plugin;

declare class Plugin {
  constructor(options?: Plugin.Options);

  apply(compiler: Compiler): void;
}

declare namespace Plugin {
  interface Options {
    /**
     * Output directory of the bundle tracker JSON file
     * Default: `'.'`
     */
    path: string;
    /**
     * Name of the bundle tracker JSON file.
     * Default: `'webpack-stats.json'`
     */
    filename: string;
    /**
     * Property to override default `output.publicPath` from Webpack config file.
     */
    publicPath: string;
    /**
     * Output `startTime` and `endTime` properties to JSON file.
     * Default: `false`
     */
    logTime: boolean;
  }
}
