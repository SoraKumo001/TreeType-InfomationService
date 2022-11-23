const path = require("path");
const glob = require("glob");
const svgToTinyDataUri = require("mini-svg-data-uri");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const srcDir = "/src/front";
const config = {
  mode: "production",
  //mode: "development",
  entry: [path.resolve(__dirname + srcDir, "index.ts")].concat(
    glob.sync(path.resolve(__dirname + srcDir, "**/*.auto.ts"))
  ),
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist/public/js"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "template"),
          to: path.resolve(__dirname, "dist", "template"),
        },
        {
          from: path.resolve(__dirname, "public"),
          to: path.resolve(__dirname, "dist", "public"),
        },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: "../style.css",
      ignoreOrder: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.ts|\.tsx$/,
        use: ["ts-loader"],
      },
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre",
      },
      {
        test: /\.(scss|css)$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
      {
        test: /\.(jpg|png|gif)$/,
        type: "asset/inline",
      },
      {
        test: /\.svg/,
        type: "asset/inline",
        generator: {
          dataUrl: (content) => {
            return svgToTinyDataUri(content.toString());
          },
        },
        use: [{ loader: "svgo-loader" }],
      },
    ],
  },
  resolve: {
    symlinks: false,
    extensions: [".ts", ".js", ".scss", "css", ".svg"],
  },
};
config.devtool = "source-map";
module.exports = config;
