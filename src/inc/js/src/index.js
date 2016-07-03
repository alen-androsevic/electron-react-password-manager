'use strict'

$(function() {
  $('.meter > span').each(function() {
    $(this).data('origWidth', $(this).width()).width(0).animate({
        width: $(this).data('origWidth'),
      }, 1200)
  })

  // When main process sends progressData
  ipcRenderer.on('progressData', function(event, progressData) {
    if (progressData.progress == 100) {
      $('.progressbar-container').hide('slow')
    } else {
      $('.progressbar-container').show('fast')
    }

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
