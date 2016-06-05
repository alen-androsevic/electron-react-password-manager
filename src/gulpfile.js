'use strict'

const gulpWebpack  = require('gulp-webpack')
const gulp         = require('gulp')
const gcb          = require('gulp-callback')
const concat       = require('gulp-concat')
const rename       = require('gulp-rename')
const uglify       = require('gulp-uglify')
const ignore       = require('gulp-ignore')
const gulpUtil     = require('gulp-util')
const minifyCSS    = require('gulp-minify-css')
const electron     = require('electron-connect').server.create()
const htmlmin      = require('gulp-htmlmin')
const async        = require('async')
const timer        = require('./lib/timer')
const fs           = require('fs')

const debounceDelay = {debounceDelay: 2000}

gulp.task('default', () => {
  // Build the all the files on start, just to be sure :)
  rebuildAll(() => {
    electron.start()
  })

  gulp.watch([
    'lib/*',
    'lib/*/**',
    'main.js',
  ], debounceDelay, (() => {
    console.log('Program change detected, restarting')
    electron.stop()
    electron.restart()
  }))
  gulp.watch([
    'inc/react/src/*',
  ], debounceDelay, (() => {
    console.log('React change detected, rebuilding files')
    electron.stop()
    buildAllReact(() => {
      electron.restart()
    })
  }))
  gulp.watch([
    'inc/css/src/*',
  ], debounceDelay, (() => {
    console.log('CSS Change detected, minfiying and concating css files')
    electron.stop()
    buildCss(() => {
      electron.restart()
    })
  }))
  gulp.watch([
    'inc/js/src/*',
  ], debounceDelay, (() => {
    console.log('JS Change detected, minfiying and concating js files')
    electron.stop()
    buildJs(() => {
      electron.restart()
    })
  }))
  gulp.watch([
    'inc/html/src/*',
  ], debounceDelay, (() => {
    console.log('HTML Change detected, minfiying html files')
    electron.stop()
    buildHtml(() => {
      electron.restart()
    })
  })
)
})

// How we build React
const buildReact = (file, cb) => {
  let time = new timer()

  gulp.src('inc/react/src/' + file + '.js')
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
        filename: file + '.js',
      },
    }
  ))
  .pipe(gulp.dest('inc/react/build/'))
  .pipe(gcb(() => {
    console.log('buildReact(' + file + ') task complete: ' + time.stop() + 'ms')
    cb()
  }))
}

// How we build the html
const buildHtml = cb => {
  let time = new timer()

  gulp.src('inc/html/src/**/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('inc/html/build'))
  console.log('buildHtml task complete: ' + time.stop() + 'ms')
}

// How we build the css
const buildCss = cb => {
  let time = new timer()

  gulp.src('inc/css/src/**/*.css')
    .pipe(minifyCSS())
    .pipe(concat('main.min.css'))
    .pipe(gulp.dest('inc/css/build'))
    .pipe(gcb(() => {
      console.log('BuildCss task complete: ' + time.stop() + 'ms')
      if (cb)
        cb()
    }))
}

// How we build the javascript
const buildJs = cb => {
  let time = new timer()

  gulp.src(['inc/js/src/!/*.js', 'inc/js/src/*.js'])
    .pipe(uglify().on('error', gulpUtil.log))
    .pipe(concat('main.js'))
    .pipe(ignore.exclude(['**/*.map']))
    .pipe(gulp.dest('inc/js/build'))
    .pipe(rename('main.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('inc/js/build'))
    .pipe(gcb(() => {
      console.log('BuildJs task complete: ' + time.stop() + 'ms')
      if (cb)
        cb()
    }))
}

// How we build all react files
const buildAllReact = cb => {
  let time = new timer()

  // First we get the files to transpile
  let reactFiles = {}
  let files = fs.readdirSync('inc/react/src/')
  for (let i in files) {
    let name = 'inc/react/src/' + files[i]
    let file = name.split('/')[name.split('/').length-1].split('.')[0]
    reactFiles[i] = {
      file,
    }
  }

  // Then we transpile them in async
  async.forEachOf(reactFiles, (value, key, callback) => {
    buildReact(value.file, () => {
      callback()
    })
  }, err => {
      if (err)
        throw new Error(err)

      console.log('RebuildAllReact task complete: ' + time.stop() + 'ms')
      if (cb)
        cb()
  })
}

// How we rebuild all
const rebuildAll = cb => {
  let time = new timer()

  async.parallel({
    html: callback => {
      buildHtml(() =>  {
        callback()
      })
    },
    js: callback => {
      buildJs(() =>  {
        callback()
      })
    },
    css: callback => {
      buildCss(() =>  {
        callback()
      })
    },
    buildAllReact: callback => {
      buildAllReact(() =>  {
        console.log('rebuildAll task complete: ' + time.stop() + 'ms')
        if (cb)
          cb()
      })
    }
  })
}
