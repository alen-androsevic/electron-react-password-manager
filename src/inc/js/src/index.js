'use strict'

var variableTimeout
var packageInfo

function tableRender() {
  $('table td:nth-child(3)').each(function(index, element) {
    var attr = $(this).attr('password')
    if (typeof attr !== typeof undefined && attr !== false) {} else {
      $(this).attr('password', $(this).html()).html($(this).html().replace(/[^\s]/g, '*'))
    }
  })

  $('table td:nth-child(3)').unbind('mouseover').unbind('mouseout')

  $('table td:nth-child(3)').on('mouseover', function() {
    $(this).html($(this).attr('password'))
  })

  $('table td:nth-child(3)').on('mouseout', function() {
    $(this).html($(this).html().replace(/[^\s]/g, '*'))
  })
}

// Send a request to get server data

$(function() {
  // TODO: make this in react.. looooooooooooooool

  // Page effect
  $('body').fadeOut(0).fadeIn('slow')

  // Toolbar
  ipcRenderer.send('packageInfo')
  ipcRenderer.on('packageInfo', function(event, packageInfo) {
    var toolbar = '<div class="toolbar">'
    toolbar +=    ' <img src="../../img/logo.png" style="paddingBottom: 13px;" width="30px"/>'
    toolbar +=    ' <h3 style="display:inline">' + packageInfo.name + '</h3>'
    toolbar +=    ' <button onclick="ipcRenderer.send(\'close\')" type="button" class="btn btn-danger pull-right">X</button>'
    toolbar +=    ' <button onclick="ipcRenderer.send(\'minimise\')" type="button" class="btn btn-warning pull-right">_</button>'
    toolbar +=    '</div>'
    $('body').prepend(toolbar)
  })

  var findTable = setInterval(function() {
    if ($('table').length) {
      clearInterval(findTable)
      tableRender()
    }
  }, 1)

  // When main process sends progressData
  ipcRenderer.on('progressData', function(event, progressData) {
    if (progressData.progress == 100) {
      clearTimeout(variableTimeout)
      variableTimeout = setTimeout(function() {
        $('.progressbar-container').hide('slow')
        $('.progressbar-progress').css({
          width: '0%',
        })
      }, 1000)
    }

    if (progressData.progress == 0)
      $('.progressbar-container').show('fast')

    if ($('.alert').length <= 0) {
      const htmlData = '<div class="alert alert-info"><h3>' + progressData.title + '</h3><h5>' + progressData.desc + '</h5></div>'
      $('.progressbar-container').append(htmlData)
    } else {
      $('.alert h3').html(progressData.title)
      $('.alert h5').html(progressData.desc)
    }

    $('.progressbar-progress').css({
      width: progressData.progress + '%',
    })
  })

  ipcRenderer.on('serviceAdd', function(event, data) {
    $('table > tbody:last-child').append('<tr><td>' + data.service + '</td><td>' + data.email + '</td><td>' + data.password + '</td><td></td></tr>')
  })
})
