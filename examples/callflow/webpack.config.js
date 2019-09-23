const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test:/\.css$/,
        use:['style-loader','css-loader']
      }
    ]
  },
  plugins: [new HtmlWebpackPlugin({
    title: 'Call flows in CompassJS',
    template: './src/index.html',
    filename: 'index.html'
  })],
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, './dist/')
  },
  devServer: {
    contentBase: path.join(__dirname, './public/'),
    open: true
  }
};
