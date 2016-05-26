const path = require('path')
const mac = require('getmac')

let mainWindow
 
exports.init = (electron, cb) => {
  electron.app.on('ready', () => {
    createApp()
  })

  electron.app.on('window-all-closed', function () {  
    if (process.platform !== 'darwin') electron.app.quit()
  }) 

  electron.app.on('activate', function () {
    if (mainWindow === null) createApp()
  }) 
 
  function createApp(){
    mac.getMac(function(err,macAddress){
      if(err) cb(err)
      electron.mac = macAddress
      mainWindow = new electron.BrowserWindow({
        useContentSize: true,
        center: true,
        title: "Pass App",
        icon: path.join(__dirname,"inc","img","logo.png"),
        acceptFirstMouse: true,
        autoHideMenuBar: true 
      })
      
      if(electron.dev) mainWindow.webContents.openDevTools()
        
      mainWindow.on('closed', function () {
        mainWindow = null
      })
      
      exports.loadPage('login')
    })
  } 
} 

exports.loadPage = page => {
  setTimeout((page, mainWindow) => {
    const htmlPath = path.join(__dirname, "../", "inc", "html")
    mainWindow.loadURL(`file://${htmlPath}/${page}.html`)
  }, 50, page, mainWindow)
}