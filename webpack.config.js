const path = require("path");
const glob = require("glob");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = "/src/front";
const config = {
  mode: 'production',
  //mode: "development",
  entry: [path.resolve(__dirname + srcDir, "index.ts")].concat(
    glob.sync(path.resolve(__dirname + srcDir, "**/*.auto.ts"))
  ),
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist/public/js")
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "template"),
          to: path.resolve(__dirname, "dist", "template")
        }
      ]
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts|\.tsx$/,
        use: ["ts-loader"]
      },
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre"
      },
      {
        test: /\.(scss|css)$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /\.(jpg|png|svg|gif)$/,
        type: "asset/inline"
      }
    ]
  },
  resolve: {
    symlinks: false,
    extensions: [".ts", ".js", ".scss", "css", ".svg"]
  }
};
//if (config.mode === "development") {
config.devtool = "source-map";
//}
module.exports = config;
