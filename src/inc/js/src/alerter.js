'use strict'

const path = require('path')

// On main process reply
ipcRenderer.on('reply', function(event, msg) {
  var presets = []
  var obj = {
    title: msg.humane.title,
    text: msg.humane.msg,
    type: msg.humane.type,
  }

  if (msg.humane.type == 'success') {
    presets.push('success')
  } else {
    obj.confirmButtonText = 'Oops'
    presets.push('warning')
  }

  alerter(obj, presets)
})

// TODO: make this work with all client swal calls
function alerter(overrideSettings, presets, cb) {
  var defaultSettings = {}
  var playAudio
  if (!presets)
    presets = []

  if (!audioOn)
    presets.push('nosound')

  if (presets.indexOf('warning') >= 0) {
    defaultSettings.type = 'warning'
    defaultSettings.confirmButtonColor =  '#DD6B55'
    playAudio = new Audio('file:///' + __dirname + '/../../sounds/error.mp3')
  }

  if (presets.indexOf('info') >= 0) {
    defaultSettings.type = 'info'
    defaultSettings.confirmButtonColor =  '#5dd55d'
    playAudio = new Audio('file:///' + __dirname + '/../../sounds/info.mp3')
  }

  if (presets.indexOf('success') >= 0) {
    defaultSettings.type = 'success'
    defaultSettings.timer = 1000
    defaultSettings.showConfirmButton = false
    defaultSettings.confirmButtonColor =  '#5dd55d'
    playAudio = new Audio('file:///' + __dirname + '/../../sounds/success.mp3')
  }

  if (presets.indexOf('confirm') >= 0)
    defaultSettings.showCancelButton = true

  if (presets.indexOf('red') >= 0)
    defaultSettings.confirmButtonColor = '#DD6B55'

  if (presets.indexOf('green') >= 0)
    defaultSettings.confirmButtonColor = '#5dd55d'

  if (presets.indexOf('nosound') == -1)
    playAudio.play()


  var finalSettings = MergeRecursive(defaultSettings, overrideSettings)
  if (finalSettings.timer) {
    swal(finalSettings)
  } else {
    swal(finalSettings, function() {
      if (cb)
        cb()
    })
  }
}

function MergeRecursive(obj1, obj2) {
  for (var p in obj2) {
    try {
      if (obj2[p].constructor == Object) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p])

      } else {
        obj1[p] = obj2[p]
      }
    } catch (e) {
      obj1[p] = obj2[p]
    }
  }

  return obj1
}
