'use strict'

const gulpWebpack = require('gulp-webpack')
const gulp        = require('gulp')
const gcb         = require('gulp-callback')
const concat      = require('gulp-concat')
const rename      = require('gulp-rename')
const uglify      = require('gulp-uglify')
const ignore      = require('gulp-ignore')
const gulpUtil    = require('gulp-util')
const minifyCSS   = require('gulp-minify-css')
const electron    = require('electron-connect').server.create()
const htmlmin       = require('gulp-htmlmin')

gulp.task('default', function() {
  // Watch for changes in these files
  gulp.watch([
    'inc/css/src/*',
    'inc/js/src/*',
    'inc/html/src/*',
    'inc/react/src/*',
    'lib/*',
    'lib/*/**',
    'main.js',
  ], {debounceDelay: 8000}, (() => {
    // What do we do when a change has been detected
    console.log('Change detected, reloading/rebuilding files')
    electron.stop()
    rebuildAll(() => {
      electron.restart()
    })
  })
)
})

// How we build React
const buildReact = (file, cb) => {
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
    cb()
  }))
}

// How we build the html
const buildHtml = cb => {
  gulp.src('inc/html/src/**/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('inc/html/build'))
}

// How we build the css
const buildCss = cb => {
  gulp.src('inc/css/src/**/*.css')
    .pipe(minifyCSS())
    .pipe(concat('main.min.css'))
    .pipe(gulp.dest('inc/css/build'))
    .pipe(gcb(() => {
      if (cb)
        cb()
    }))
}

// How we build the javascript
const buildJs = cb => {
  gulp.src(['inc/js/src/!/*.js', 'inc/js/src/*.js'])
    .pipe(uglify().on('error', gulpUtil.log))
    .pipe(concat('main.js'))
    .pipe(ignore.exclude(['**/*.map']))
    .pipe(gulp.dest('inc/js/build'))
    .pipe(rename('main.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('inc/js/build'))
    .pipe(gcb(() => {
      if (cb)
        cb()
    }))
}

// How we rebuild all
const rebuildAll = cb => {
  buildHtml() // No need to show when done, so fast.
  buildJs(() => {
    console.log('Javascript build complete')
    buildCss(() => {
      console.log('Css build complete')
      buildReact('create', () => {
        console.log('React build \'create\' complete.')
        buildReact('index', () => {
          console.log('React build \'index\' complete.')
          buildReact('login', () => {
            console.log('React build \'login\' complete.')
            if (cb)
              cb()
          })
        })
      })
    })
  })
}

// Build the all the files on start, just to be sure :)
rebuildAll(() => {
  electron.start()
})
