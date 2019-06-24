const path = require('path');

module.exports = {
  //mode: 'production',
  mode: 'development',
  entry: [
    path.resolve(__dirname, 'src/public/index.ts')
  ],
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
      use: ['babel-loader', 'source-map-loader'],
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
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist/public'),
    host: "localhost"
  },
};
