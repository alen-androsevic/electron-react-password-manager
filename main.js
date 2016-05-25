const electron = require('electron')
const connection = new(require('nosqlite').Connection)('./inc')
const storage = connection.database('db')
 
electron.dev = false;
electron.appReady = false;
electron.ipcMain = require('electron')
electron.passwords = storage

const events = require('./lib/events').init(electron, (err, data) => {
  if(err) throw new Error(err)
})
const socket = require('./lib/socket').init(electron, (err, data) => {
  if(err) throw new Error(err)
})