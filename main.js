const electron = require('electron')
const path = require('path');
const fs = require('fs');
const {ipcMain} = require('electron');
const passwordHash = require('password-hash'); 
const defaultPass = "admin";
const maintitle = "Password App";
var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());
var cryptico = require('cryptico');
var key;

const app = electron.app
const BrowserWindow = electron.BrowserWindow
const dev = true
 
var appReady = false;

var myRSA;
var myPUB;
 
let mainWindow 

var waitForAppInterval = setInterval(waitForApp,100);
function waitForApp(){ 
  if(appReady){  
    mainWindow.loadURL(`file://${__dirname}/login.html`) 
    clearInterval(waitForAppInterval)
  } 
}
  
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

ipcMain.on('login', (event, inputPass) => { 
  myRSA = cryptico.generateRSAKey(inputPass, 2048);
  myPUB = cryptico.publicKeyString(myRSA);
  
  passwords.all(function (err, results) {
    if(err) throw new Error(err)
    for(i in results){
      decryptString(results[i].password, function(decrypted){
      if(!decrypted){ 
        msg = {
          result: false, 
          humane: {
            title: maintitle,
            msg: "Wrong password!" 
          }
        } 
        event.sender.send('reply', msg);
      }else{
        msg = {
          result: false, 
          humane: {
            title: maintitle,
            msg: "Login succeeded, please wait.." 
          }
        }
        event.sender.send('reply', msg);
        mainWindow.loadURL(`file://${__dirname}/index.html`)
      }
      }); 
      break;
    }
    
    if(results.length === 0){
        msg = {
          result: false, 
          humane: {
            title: maintitle,
            msg: "Account created, logging in." 
          }
        }
        event.sender.send('reply', msg);
        mainWindow.loadURL(`file://${__dirname}/index.html`)
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
  var encrypted = cryptico.encrypt(string, myPUB)
  if(cb) cb(encrypted.cipher);
} 
function decryptString(string,cb){
  var decrypted = cryptico.decrypt(string, myRSA);
  if(cb) cb(decrypted.plaintext); 
}