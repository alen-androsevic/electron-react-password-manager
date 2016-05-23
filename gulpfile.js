'use strict';

var gulp = require('gulp');
var electron = require('electron-connect').server.create();

gulp.task('serve', function () {

  // Start browser process
  electron.start();

  // Restart browser process
  gulp.watch([
    'inc/css/*/**',
    'inc/js/*/**',
    'inc/css/*',
    'inc/js/*',
    'inc/html/*/**',
    'inc/html/*',
    'lib/*',
    'lib/*/**',
    'main.js',
  ], electron.restart);
}); 