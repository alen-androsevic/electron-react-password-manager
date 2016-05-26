const path = require('path')
const mac = require('getmac')

let mainWindow

exports.init = (electron, cb) => {
  
  // Called when Program is ready for execution of code
  electron.app.on('ready', () => {
    createApp()
  })

  // Called when all windows have been closed
  electron.app.on('window-all-closed', function () {  
    if (process.platform !== 'darwin') electron.app.quit()
  }) 

  // Called on re-activate app, useful for OSX
  electron.app.on('activate', function () {
    if (mainWindow === null) createApp()
  }) 
 
  // Without this, everything will not work! :c
  function createApp(){
    mainWindow = new electron.BrowserWindow({
      useContentSize: true,
      center: true,
      title: "Pass App",
      icon: path.join(__dirname,"inc","img","logo.png"),
      acceptFirstMouse: true,
      autoHideMenuBar: true 
    })
    
    if(electron.dev) mainWindow.webContents.openDevTools()
    
    // Called when window is being closed
    mainWindow.on('closed', function () {
      mainWindow = null
    })
    
    exports.loadPage('login')
  } 
}

// Loads local html pages
// The settimeout is there for a weird bug with desktop notifcations not showing sometimes.
exports.loadPage = page => {
  setTimeout((page, mainWindow) => {
    const htmlPath = path.join(__dirname, "../", "inc", "html")
    mainWindow.loadURL(`file://${htmlPath}/${page}.html`)
  }, 50, page, mainWindow)
}