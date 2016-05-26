const electron = require('electron')
const connection = new(require('nosqlite').Connection)('./inc/db')
const passwordStorage = connection.database('passwords')
const saltStorage = connection.database('salt')

electron.crypt = {
  bits: 2048,
  supersalt: {
    saltLen: 2048,
    maxpos: 160
  },
  pbkd2f: { 
    iterations: 300000,
    count: 420
  }
}

electron.dev = false
electron.ipcMain = electron
electron.db = {
  passwords: passwordStorage,
  salt: saltStorage
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