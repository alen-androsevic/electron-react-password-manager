'use strict'

$(function() {
  // No... just no..
  var findTable = setInterval(function() {
    if ($('table').length) {
      clearInterval(findTable)

      $('table td:nth-child(3)').each(function(index, element) {
        var attr = $(this).attr('password')
        var condition = typeof attr !== typeof undefined && attr !== false
        if (!condition) {
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

      $('table').wrapAll('<div class="passwordtable"/>')
      $('.passwordtable').css('height', $('body').height() - 140)
    }
  }, 1)
})
