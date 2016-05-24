const electron = require('electron')
const connection = new(require('nosqlite').Connection)('./inc/db')
const storage = connection.database('data')

storage.exists(function (exists) {
  electron.firstTime = false
  if (!exists){
   electron.firstTime = true
   storage.create(function (err) {
      if (err) throw new Error(err)
    });
  }
});
 
electron.dev = true;
electron.appReady = false;
electron.ipcMain = require('electron')
electron.passwords = storage

const events = require('./lib/events').init(electron, (err, data) => {
  if(err) throw new Error(err)
})
const socket = require('./lib/socket').init(electron, (err, data) => {
  if(err) throw new Error(err)
})