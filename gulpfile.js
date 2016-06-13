'use strict'

const gulp         = require('gulp')
const packageJson  = require('./src/package.json')
const gulpElectron = require('gulp-electron')
const rimraf       = require('rimraf')

gulp.task('default', () => {
  build(['win32-ia32', 'win32-x64', 'linux-ia32', 'linux-x64', 'darwin-x64'])
})

gulp.task('win32', () => {
  build(['win32-ia32'])
})

gulp.task('win64', (cb) => {
  build(['win32-x64'], cb)
})

gulp.task('darwin', () => {
  build(['darwin-x64'])
})

gulp.task('linux32', () => {
  build(['linux-ia32'])
})

gulp.task('linux64', () => {
  build(['linux-x64'])
})

const build = (platformsSet, cb) => {
  rimraf('./build', () => {
    var stream = gulp.src('').pipe(gulpElectron({
      src:         './src',
      packageJson: packageJson,
      release:     './build',
      cache:       './cache',
      version:     'v0.37.6',
      packaging:   true,
      platforms:   platformsSet,
      platformResources: {
        darwin: {
          CFBundleDisplayName: packageJson.name,
          CFBundleIdentifier:  packageJson.name,
          CFBundleName:        packageJson.name,
          CFBundleVersion:     packageJson.version,
          icon:                'gulp-electron.icns',
        },
        win: {
          'version-string':  packageJson.version,
          'file-version':    packageJson.version,
          'product-version': packageJson.version,
          icon:              'gulp-electron.ico',
        },
      },
    })).pipe(gulp.dest(''))
    stream.on('end', function() {
      cb()
    })
  })
}
