const path = require('path')

let mainWindow;

exports.init = electron => {
  const app = electron.app
  const BrowserWindow = electron.BrowserWindow
  app.on('ready', function(){
    createApp()
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
    
    if(electron.dev) mainWindow.webContents.openDevTools()
      
    mainWindow.on('closed', function () {
      mainWindow = null
    })
    
    electron.appReady = true
  } 
  const waitForApp = () => {
    if(electron.appReady){  
      exports.loadPage('login')
      clearInterval(waitForAppInterval) 
    }
  }
  const waitForAppInterval = setInterval(waitForApp, 100)
} 

exports.loadPage = page => {
  const htmlPath = path.join(__dirname, "../", "inc", "html")
  mainWindow.loadURL(`file://${htmlPath}/${page}.html`)
}