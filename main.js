const electron = require('electron')
const {ipcMain} = require('electron')
const passwords = require('nstore').extend(require('nstore/query')()).new('./inc/db/passdb.db') 

const BrowserWindow = electron.BrowserWindow

electron.dev = true;
electron.appReady = false;
electron.ipcMain = ipcMain;
electron.passwords = passwords;

const events = require('./lib/events').init(electron, (err, data) => {
  if(err) throw new Error(err);
})
const socket = require('./lib/socket').init(electron, (err, data) => {
  if(err) throw new Error(err);
})