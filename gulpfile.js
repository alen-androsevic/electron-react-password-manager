'use strict'

const webpack = require('gulp-webpack')
const gulp = require('gulp')
const gcb = require('gulp-callback')
const electron = require('electron-connect').server.create()
const first = true

electron.start()
gulp.task('serve', function() {
  // Start browser process
  restart()

  // Restart browser process
  gulp.watch([
    'inc/css/*',
    'inc/js/*',
    'inc/html/*',
    'inc/react/src/*',
    'lib/*',
    'lib/*/**',
    'main.js',
  ], (() => {
    restart()
  })
)
})

const restart = () => {
  gulp.src('inc/react/src/entry.js')
  .pipe(webpack({
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
      output: {
        filename: 'bundle.js',
      },
    }
  ))
  .pipe(gulp.dest('inc/react/build/'))
  .pipe(gcb(() => {
    console.log('here')
    electron.restart()
  }))
}
