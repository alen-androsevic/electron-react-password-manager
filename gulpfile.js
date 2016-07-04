'use strict'

const gulp         = require('gulp')
const packageJson  = require('./src/package.json')
const gulpElectron = require('gulp-electron')
const rimraf       = require('rimraf')
const path         = require('path')
const winInstaller = require('electron-windows-installer')

gulp.task('default', cb => {
  build(['win32-ia32', 'win32-x64', 'linux-ia32', 'linux-x64', 'darwin-x64'], cb)
})

gulp.task('installer', cb => {
  winInstaller({
    appDirectory: './build/v0.37.6/win32-ia32/',
    outputDirectory: './build/v0.37.6/installer/',
    arch: 'ia32',
  }).then(cb).catch(cb)
})

gulp.task('win32', cb => {
  build(['win32-ia32'], cb)
})

gulp.task('win64', cb => {
  build(['win32-x64'], cb)
})

gulp.task('darwin', cb => {
  build(['darwin-x64'], cb)
})

gulp.task('linux32', cb => {
  build(['linux-ia32'], cb)
})

gulp.task('linux64', cb => {
  build(['linux-x64'], cb)
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
        },
        win: {
          'version-string':  packageJson.version,
          'file-version':    packageJson.version,
          'product-version': packageJson.version,
        },
      },
    })).pipe(gulp.dest(''))
    stream.on('end', function() {
      cb()
    })
  })
}
