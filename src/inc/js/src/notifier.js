'use strict'

const notifier = require('node-notifier')
const path = require('path')

ipcRenderer.on('reply', function(event, msg) {
  swal({
    title: msg.humane.title,
    text: msg.humane.msg,
    type: msg.humane.type,
    imageUrl: '../../img/logo.png',
  })
})
