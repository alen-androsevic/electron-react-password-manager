'use strict'

const path         = require('path')
const {Tray, Menu, app} = require('electron')
const packageInfo  = require('../package.json')

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
  const iconPath = path.join(__dirname, '../', 'inc', 'img', 'logo.png')

  mainWindow = new electron.BrowserWindow({
    useContentSize:   true,
    center:           true,
    title:            packageInfo.name,
    icon:             iconPath,
    acceptFirstMouse: true,
    autoHideMenuBar:  true,
    frame:            false,
    titleBarStyle:    'hidden',
  })

  // Create tray and context menu
  const appIcon = new Tray(iconPath)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: packageInfo.name + ' - ' + packageInfo.version,
    },
    {
      label: 'Toggle DevTools',
      accelerator: 'Alt+Command+I',
      click: function() {
        mainWindow.show()
        mainWindow.toggleDevTools()
      },
    },
    { label: 'Quit',
      accelerator: 'Command+Q',
      click: function() {
        electron.app.quit()
      },
    },
  ])
  appIcon.setToolTip(packageInfo.name)
  appIcon.setContextMenu(contextMenu)

  if (electron.dev)
    mainWindow.webContents.openDevTools()

  // Called when window is being closed
  mainWindow.on('closed', function() {
    mainWindow = null
  })

  electron.maximized = false
  electron.mainWindow = mainWindow
}

// Loads local html pages
exports.loadPage = (page, waitTime) => {
  const condition = typeof (waitTime) == 'undefined'
  if (condition)
    waitTime = 0

  waitTime = waitTime * 1000
  setTimeout((page, mainWindow) => {
    if (!mainWindow) {
      // App is not ready yet? wait a bit!
      setTimeout(exports.loadPage, 10, page)
      return
    }

    const htmlPath = path.join(__dirname, '../', 'inc', 'html', 'build')
    mainWindow.loadURL(`file://${htmlPath}/${page}.html`)
  }, waitTime, page, mainWindow)
}
