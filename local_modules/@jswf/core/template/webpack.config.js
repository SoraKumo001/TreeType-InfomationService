const path = require('path');
const glob = require("glob");
const TerserPlugin = require('terser-webpack-plugin');
const srcDir = "src/public";
const outDir = "dist/public";
const config = {
  mode: 'production',
  //mode: 'development',
  entry: [
    path.resolve(__dirname, srcDir,'index.ts'),
    ...glob.sync(path.resolve(__dirname, srcDir,"/**/*.auto.ts"))
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname,outDir, 'js')
  },
  module: {
    rules: [{
      test: /\.ts|\.tsx$/,
      use: ['ts-loader']
    }, {
      test: /\.js$/,
      use: ['source-map-loader'],
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
      test: /\.(jpeg|jpg|png|svg|gif)$/,
      loaders: 'url-loader'
    },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.scss', 'css', '.svg', '.jpg', 'jpeg', '.gif', 'png'],
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
  performance: { hints: false },
  devServer: {
    contentBase: path.join(__dirname, outDir),
    publicPath: "/js/",
    host: "localhost"
  },
};
//if (config.mode === "development") {
config.devtool = 'source-map';
//}
module.exports = config;