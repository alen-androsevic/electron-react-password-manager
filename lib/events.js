'use strict'

const path = require('path')

let mainWindow
let electron

exports.init = (a, cb) => {
  electron = a

  // Called when Program is ready for execution of code
  electron.app.on('ready', () => {
    exports.createApp()
  })

  // Called when all windows have been closed
  electron.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      electron.app.quit()
    }
  })

  // Called on re-activate app, useful for OSX
  electron.app.on('activate', () => {
    if (mainWindow === null) {
      exports.createApp()
    }
  })
}

// Creates the app
exports.createApp = () => {
  mainWindow = new electron.BrowserWindow({
    useContentSize:   true,
    center:           true,
    title:            'Pass App',
    icon:             path.join(__dirname, 'inc', 'img', 'logo.png'),
    acceptFirstMouse: true,
    autoHideMenuBar:  true,
  })

  if (electron.dev)
    mainWindow.webContents.openDevTools()

  // Called when window is being closed
  mainWindow.on('closed', function() {
    mainWindow = null
  })
}

// Loads local html pages
// The settimeout is there for a weird bug with desktop notifcations not showing sometimes.
exports.loadPage = page => {
  setTimeout((page, mainWindow) => {
    if (!mainWindow) {
      // App is not ready yet? wait a bit!
      setTimeout(exports.loadPage, 10, page)
      return
    }

    const htmlPath = path.join(__dirname, '../', 'inc', 'html')
    mainWindow.loadURL(`file://${htmlPath}/${page}.html`)
  }, 50, page, mainWindow)
}
