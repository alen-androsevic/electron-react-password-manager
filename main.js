const electron = require('electron')
const path = require('path');
const fs = require('fs');
const {ipcMain} = require('electron');
const passwordHash = require('password-hash');
const defaultPass = "admin";
const maintitle = "Password App";
var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());
var NodeRSA = require('node-rsa');
var key;
var pemKey;

// TODO: find a way to secure the pem ? :P
fs.readFile('./keys/private.pem', 'utf8', function (err,data) {
  if (err) throw new Error(err);
  pemKey = data;
  key = new NodeRSA(data);  
});

const app = electron.app
const BrowserWindow = electron.BrowserWindow
const dev = true
 
var isNew = true;
var appReady = false;

let mainWindow 

try {
    fs.accessSync("./data.db", fs.F_OK);
    isNew = false;
} catch (e) {}

var waitForAppInterval = setInterval(waitForApp,100);
function waitForApp(){
  if(appReady){ 
    if(isNew){
      mainWindow.loadURL(`file://${__dirname}/firsttime.html`)
    }else{
      mainWindow.loadURL(`file://${__dirname}/login.html`)
    }
    clearInterval(waitForAppInterval)
  } 
}
  
var db = nStore.new('./data.db');
var passwords = nStore.new('./passdb.db'); 

app.on('ready', function(){
  createApp();
})

app.on('window-all-closed', function () {  
  if (process.platform !== 'darwin') app.quit()
}) 

app.on('activate', function () {
  if (mainWindow === null) createApp()
}) 

function createApp(){
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 700,
  })
  
  if(dev) mainWindow.webContents.openDevTools()
    
  mainWindow.on('closed', function () {
    mainWindow = null
  })
  
  appReady = true;
} 

ipcMain.on('create', (event, data) => {
  if(data.pass1.length===0){
    msg = {
      result: false,
      humane: {
        title: maintitle,
        msg: "Password length too low"
      }
    }
    event.sender.send('reply', msg);
    return;
  }
  if(data.pass1 !== data.pass2){ 
    msg = {
      result: false,
      humane: { 
        title: maintitle,
        msg: "Passwords do not match"
      }
    }
    event.sender.send('reply', msg);
    return;
  }
  db.save("mainpass", {password: hashPass(data.pass1), created: Date.now()}, function (err) {
      if (err) { throw err; }
      msg = {
        result: true,
        humane: {
          title: maintitle,
          msg: "Account created!"
        }
      }
      event.sender.send('reply', msg);
      mainWindow.loadURL(`file://${__dirname}/login.html`)
  });
});

ipcMain.on('login', (event, inputPass) => { 
  db.get("mainpass", function (err, res) {
   if(err) throw new Error(err)
    if(passwordHash.verify(inputPass, res.password)){
      msg = {
        result: false, 
        humane: {
          title: maintitle,
          msg: "Login succeeded, please wait.." 
        }
      }
      event.sender.send('reply', msg);
      
      mainWindow.loadURL(`file://${__dirname}/index.html`)
    }else{ 
      msg = {
        result: true,
        humane: {
          title: maintitle,
          msg: "Login failed, please try again."
        }
      }
      event.sender.send('reply', msg);
    }
  });
});
 
ipcMain.on('addService', (event, post) => {
  encryptString(post.password, function(encrypted){
    post.password = encrypted;
    passwords.save(null, post, function (err) {
        if (err) throw new Error(err);
        msg = {
          result: true, 
          humane: {
            title: maintitle,
            msg: "Password added!"
          }
        }
        event.sender.send('reply', msg);
    });
  });
});
 
ipcMain.on('populateTable',  (event) => {
  passwords.all(function (err, results) {
    if(err) throw new Error(err)
    for(i in results){
      decryptString(results[i].password, function(decrypted){
        results[i].password = decrypted
      });
    }
    event.sender.send('passtable', results);
  });
}); 

function encryptString(string,cb){
  try { 
    var encrypted = key.encrypt(string, 'base64')
  } catch(e){
    console.log(e);
  } 
  if(cb) cb(encrypted);
}
function decryptString(string,cb){
    key.importKey(pemKey, 'pkcs8'); 
    try { 
      var decrypted = key.decrypt(string,'utf8')
    } catch(e){ 
      console.log(e);
    }
  if(cb) cb(decrypted);
}

function hashPass(pass){
  return passwordHash.generate(pass);
}