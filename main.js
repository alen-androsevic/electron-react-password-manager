const electron = require('electron')
const {ipcMain} = require('electron')
const path = require('path')
const fs = require('fs-extra');
const nstore = require('nstore')
const nstoreQuery = nstore.extend(require('nstore/query')())

fs.mkdirsSync(path.join(__dirname, "inc", "db"))
const passwords = nstoreQuery.new('./inc/db/passdb.db')

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