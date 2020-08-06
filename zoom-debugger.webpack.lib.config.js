const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require("path");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: "./src/zoom-debugger/zoom-debugger.ts",
  output: {
      library: 'ZoomDebugger',
      libraryTarget: 'umd',
      filename: "zoom-debugger.js",
      path: path.resolve(__dirname, "zoom-debugger-build")
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: "ts-loader" }
    ]
  }
};
