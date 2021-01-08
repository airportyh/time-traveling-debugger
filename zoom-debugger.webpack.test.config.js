const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require("path");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: "./src/zoom-debugger/test-zoom-debugger.ts",
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: "ts-loader" }
    ]
  },
  plugins: [
      new HtmlWebpackPlugin()
  ],
  devServer: {
    open: true,  
    hot: true,
    inline: true
  }
};
