const electron = require('electron')
const connection = new(require('nosqlite').Connection)('./inc/db')

electron.crypt = {
  bits: 2048,
  supersalt: {
    saltLen: 2048,
    maxpos: 190
  },
  pbkd2f: {
    iterations: 300000,
    count: 420
  }
}

electron.dev = false
electron.ipcMain = electron
electron.db = {
  passwords: connection.database('passwords'),
  salt: connection.database('salt'),
  encryption: connection.database('encryption')
}

electron.log = log => {
  console.log(log) 
}

const events = require('./lib/events').init(electron, (err, data) => {
  if(err) throw new Error(err)
})

const socket = require('./lib/socket').init(electron, (err, data) => {
  if(err) throw new Error(err)
})