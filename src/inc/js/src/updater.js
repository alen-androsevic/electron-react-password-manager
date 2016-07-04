'use strict'

$(function() {
  // Check for updates
  ipcRenderer.on('packageInfo', function(event, packageInfo) {
    if (packageInfo.update.available) {
      var text = 'A new version has been found of '  + packageInfo.name
      text +=    '\n\nYour version: ' + packageInfo.version
      text +=    '\nNew version:  ' + packageInfo.update.newversion + '\n'
      alerter({
        title: 'New Version!',
        text: text,
        confirmButtonText: 'Download Update',
      }, ['info', 'confirm'], function() {
        ipcRenderer.send('newversion', packageInfo.update.newversion)
      })
    }
  })
})
