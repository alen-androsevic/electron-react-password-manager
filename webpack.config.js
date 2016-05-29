'use strict'

const webpack = require('webpack')

module.exports = {

  entry: {
    app: ['./inc/react/entry.js'],
  },

  output: {
    path: './inc/react',
    filename: 'bundle.js',
  },

  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['react'],
        },
      },
    ],
  },
}
