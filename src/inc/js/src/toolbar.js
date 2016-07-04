'use strict'

$(function() {
  ipcRenderer.on('packageInfo', function(event, packageInfo) {
    var toolbar = '<div class="toolbar">'
    toolbar +=    ' <img src="../../img/logo.png" />'
    toolbar +=    ' <h3>' + packageInfo.name + '</h3>'
    toolbar +=    ' <h5>v' + packageInfo.version + '</h5>'
    toolbar +=    ' <div class="btn-group pull-right" role="group">'
    toolbar +=    '   <button id="toolbar-minimize" type="button" class="btn btn-warning">&#95;</button>'
    toolbar +=    '   <button id="toolbar-maximize" type="button" class="btn btn-info">&square;</button>'
    toolbar +=    '   <button id="toolbar-close" type="button" class="btn btn-danger">&times;</button>'
    toolbar +=    ' </div>'
    toolbar +=    '</div>'
    $('body').prepend(toolbar)


    // Why the arbitrary 14 :(
    $('.toolbar .btn').height($('.toolbar').height() - 14).width($('.toolbar').width() / 28)

    $('#toolbar-close').click(function() {
      alerter({
        title: 'Quit ' + packageInfo.name + ' ?',
        text: 'Are you sure you want to quit ' + packageInfo.name + ' ?',
        confirmButtonText: 'Quit',
      }, ['warning', 'confirm', 'red'], function() {
        ipcRenderer.send('close')
      })
    })

    $('#toolbar-minimize').click(function() {
      ipcRenderer.send('minimise')
    })

    $('#toolbar-maximize').click(function() {
      ipcRenderer.send('maximize')
    })

    $('.toolbar').slideUp(0).slideDown('fast')
  })
})
