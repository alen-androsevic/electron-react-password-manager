'use strict'

const gulp         = require('gulp')
const packageJson  = require('./src/package.json')
const gulpElectron = require('gulp-electron')
const rimraf       = require('rimraf')

gulp.task('default', () => {
  rimraf('./build', () => {
    gulp.src('')
    .pipe(gulpElectron({
      src:         './src',
      packageJson: packageJson,
      release:     './build',
      cache:       './cache',
      version:     'v0.37.6',
      packaging:   true,
      platforms:   ['win32-ia32', 'win32-x64'],
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
    }))
    .pipe(gulp.dest(''))
  })
})
