'use strict'

ipcRenderer.on('reply', function(event, msg) {
  notifier.notify({
    title: msg.humane.title,
    message: msg.humane.msg,
    icon: path.join(__dirname, 'inc', 'img', 'logo.png'),
    sound: false,
    wait: false,
  })
  replied(msg)
})
