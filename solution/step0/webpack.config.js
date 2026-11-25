// プラグインをビルドする設定。ConsoleRemotePlugin が package.json の consolePlugin と
// console-extensions.json を読み、コンソールが読み込める形（plugin-manifest.json と
// モジュールに分けた JavaScript）を dist/ に出す
const path = require('path');
const { ConsoleRemotePlugin } = require('@openshift-console/dynamic-plugin-sdk-webpack');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {},
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-bundle-[contenthash].min.js',
    chunkFilename: '[name]-chunk-[chunkhash].min.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      // TypeScript / JSX を JavaScript にする（型チェックはしない。型チェックは npm run build の tsc）
      { test: /\.(jsx?|tsx?)$/, exclude: /node_modules/, use: 'swc-loader' },
      // 依存パッケージの ESM を拡張子なしの import で読めるようにする
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
    ],
  },
  plugins: [new ConsoleRemotePlugin()],
  devtool: 'source-map',
};
