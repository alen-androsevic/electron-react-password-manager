'use strict'

$(function() {
  var variableTimeout

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
})
