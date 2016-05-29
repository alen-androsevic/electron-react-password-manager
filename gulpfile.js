'use strict'

const gulpWebpack  = require('gulp-webpack')
const webpack = require('webpack')
const gulp = require('gulp')
const gcb = require('gulp-callback')
const concat = require('gulp-concat')
const rename = require('gulp-rename')
const uglify = require('gulp-uglify')
const ignore = require('gulp-ignore')
const gulpUtil = require('gulp-util')
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
  gulp.src(['inc/js/src/!/*.js', 'inc/js/src/*.js'])
      .pipe(uglify().on('error', gulpUtil.log))
      .pipe(concat('main.js'))
      .pipe(ignore.exclude(['**/*.map']))
      .pipe(gulp.dest('inc/js/build'))
      .pipe(rename('main.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest('inc/js/build'))


  gulp.src('inc/react/src/entry.js')
  .pipe(gulpWebpack({
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
