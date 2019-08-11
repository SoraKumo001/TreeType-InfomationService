const path = require('path');
const glob = require("glob");
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const srcDir = "/src/front";
const config = {
  //mode: 'production',
  mode: 'development',
  entry: [
    path.resolve(__dirname+srcDir,'index.ts'),
  ].concat(glob.sync(path.resolve(__dirname+srcDir,"**/*.auto.ts"))),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/public/js')
  },
  module: {
    rules: [{
      test: /\.ts|\.tsx$/,
      use: ['ts-loader']
    }, {
      test: /\.js$/,
      use: [ 'source-map-loader'],
      enforce: "pre"
    }, {
      test: /\.(scss|css)$/,
      use: [
        'style-loader',
        'css-loader',
        'sass-loader'
      ],
    },
    {
      test: /\.(jpg|png|svg|gif)$/,
      loaders: 'url-loader'
    },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.scss', 'css', '.svg'],
    moduleExtensions: ['node_modules']
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        terserOptions: {
          output: {
            comments: false,
            beautify: false
          },
        },
      })
    ]
  },
  plugins: [
    new HardSourceWebpackPlugin()
  ]
};
if (config.mode === "development") {
  config.devtool = 'source-map';
}
module.exports = config;