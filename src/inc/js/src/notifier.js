'use strict'

const path = require('path')

ipcRenderer.on('reply', function(event, msg) {
  var obj = {
    title: msg.humane.title,
    text: msg.humane.msg,
    type: msg.humane.type,
    imageUrl: '../../img/logo.png',
  }

  if (msg.humane.type == 'success') {
    obj.timer = 2000
  }

  swal(obj)
})
