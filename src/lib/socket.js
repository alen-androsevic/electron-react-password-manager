'use strict'

const crypto      = require('./crypto')
const events      = require('./events')
const timer       = require('./timer')
const chkErr      = require('./error').chkErr
const mkdirp      = require('mkdirp')
const cryptoNode  = require('crypto')
const async       = require('async')
const fs          = require('fs')
const path        = require('path')
const os          = require('os')
const packageInfo = require('../package.json')
const request     = require('request')
const http        = require('http')

let electron
let callbackError

exports.init = (a, cb) => {
  electron = a
  callbackError = cb

  crypto.init(electron)

  // Create the databases if they do not exists
  exports.createIfNotExists(electron.db.passwords)
  exports.createIfNotExists(electron.db.encryption)
  exports.createIfNotExists(electron.db.salt)


  // First we expect this is the first time always
  electron.firstTime = false
  electron.db.encryption.exists((exists) => {
    // Then check if a encryption database value has already been created
    // Which implies that this is the first time the program has run or the user has not added passwords yet
    if (exists) {
      if (electron.db.encryption.allSync().length >= 1) {
        electron.firstTime = false
      } else {
        electron.firstTime = true
      }
    }

    // And show the correct page depending on the situation
    if (electron.firstTime) {
      events.loadPage('create')
    } else {
      events.loadPage('login')
    }
  })

  // On login event
  electron.ipcMain.on('login', (event, data) => {
    // Override application data from user settings
    electron.crypt.bits              = parseInt(data.bits)
    electron.crypt.pbkd2f.iterations = parseInt(data.pbkd2f.iterations)

    // Check if passwords are same if first time run
    if (electron.firstTime) {
      if (data.pass != data.pass2) {
        exports.sendMsg(event, true, [
          'Error',
          'Passwords are not the same!',
        ])
        return
      }
      // Save encryption methods to database if run for first time
      electron.db.encryption.post(electron.crypt, (err, dbdata) => {
        chkErr(err, callbackError)
        exports.loginContinue(event, data)
        data = null // Attempt to null it out of memory :P?
      })
      return // Stop execution because loginContinue will keep it rolling
    }

    exports.loginContinue(event, data)
    data = null // Attempt to null it out of memory :P?
  })

  // When frontend requests encryption of protected folder
  electron.ipcMain.on('encryptFolder', (event, data) => {
    crypto.encryptFolder((err) => {
      chkErr(err, callbackError)
      exports.sendMsg(event, true, [
        'Folder Encrypted!',
        'Your folder is now encrypted',
      ], {id: data})
    })
  })

  // When frontend requests decryption of protected folder
  electron.ipcMain.on('decryptFolder', (event, data) => {
    crypto.decryptFolder((err) => {
      chkErr(err, callbackError)
      exports.sendMsg(event, true, [
        'Folder Decrypted!',
        'Your folder is now decrypted',
      ], {id: data})
    })
  })

  // When frontend requests encryption data
  electron.ipcMain.on('requestEncryption', (event, data) => {
    event.sender.send('requestEncryption', electron.db.encryption.allSync()[0])
  })

  // When frontend requests index data
  electron.ipcMain.on('indexRender', (event, data) => {
    event.sender.send('indexRender',  exports.getPasswords(cb), exports.getEncryptedState(cb), packageInfo.name)
  })

  // When frontend requests a logout
  electron.ipcMain.on('logout', (event, data) => {
    electron.app.relaunch()
    electron.app.quit()
  })

  // When frontend requests window close
  electron.ipcMain.on('close', (event, data) => {
    electron.app.quit()
  })

  // When frontend requests window minimise
  electron.ipcMain.on('minimise', (event, data) => {
    electron.mainWindow.minimize()
  })

  // When frontend requests window maximize
  electron.ipcMain.on('maximize', (event, data) => {
    if (!electron.maximized) {
      electron.maximized = true
      electron.mainWindow.maximize()
    } else {
      electron.maximized = false
      electron.mainWindow.unmaximize()
    }

  })

  // When frontend requests the new version
  electron.ipcMain.on('newversion', (event, data) => {
    const {shell} = require('electron')
    shell.openExternal('https://github.com/michaeldegroot/electron-react-password-manager/releases/tag/' + data)
  })

  // When frontend requests packageInfo
  electron.ipcMain.on('packageInfo', (event, data) => {
    const url = 'https://raw.githubusercontent.com/michaeldegroot/electron-react-password-manager/master/src/package.json'
    request(url, function(error, response, body) {
      packageInfo.update = {
        availible: false,
      }
      if (!error && response.statusCode == 200) {
        if (packageInfo.version < JSON.parse(body).version) {
          packageInfo.update = {
            available: true,
            newversion: JSON.parse(body).version,
          }
        }
      } else {
        let bodyTxt = 'Could not connect to githubusercontent.com to request the current version of ' + packageInfo.name
        bodyTxt += '\n\n' + response.statusCode + ' (' + http.STATUS_CODES[response.statusCode] + ')'
        exports.sendMsg(event, false, [
          'No Connection!',
          bodyTxt,
        ])
      }

      event.sender.send('packageInfo',  packageInfo)
    })
  })

  // When a password (service) has been added
  electron.ipcMain.on('addService', (event, post) => {
    let originalPost = post
    async.parallel({
      password: function(callback) {
        crypto.encryptString(post.password, (err, decrypted) => {
          callback(err, decrypted)
        })
      },

      email: function(callback) {
        crypto.encryptString(post.email, (err, decrypted) => {
          callback(err, decrypted)
        })
      },

      service: function(callback) {
        crypto.encryptString(post.service, (err, decrypted) => {
          callback(err, decrypted)
        })
      },
    },
    function(err, post) {
      electron.db.passwords.post(post, (err, data) => {
        chkErr(err, callbackError)
        exports.sendMsg(event, true, [
          'Service Added!',
          'Your service ' + originalPost.service + ' has been successfully added',
        ], {id: data})
        event.sender.send('serviceAdd', originalPost)
        originalPost = null
      })
    })
  })

  // When a password (service) has been deleted
  electron.ipcMain.on('deleteService', (event, id) => {
    electron.db.passwords.delete(id)
    exports.sendMsg(event, true, [
      'Service Removed!',
      'Your service has been successfully removed',
    ], {removedid: id})
  })
}

// This checks if a database exists and if not creates one, also some custom action for specific databases
exports.createIfNotExists = db => {
  async.waterfall([
    (callback) => {
      // Check if database exists
      db.exists((exists) => {
        callback(null, exists)
      })
    },

    (exists, callback) => {
      // Check if database does not exists and continue if so
      if (exists) {
        if (db.allSync().length === 0)
          electron.firstTime = true
      } else {
        callback()
      }
    },

    (callback) => {
      // We now expect this is the first run
      electron.firstTime = true

      // Create the encrypted folder
      mkdirp('./encryptedfolder', err => {
        chkErr(err, callbackError)
        callback()
      })
    },

    (callback) => {
      // And then create a readme
      let txt = 'You can put files in here that will be encrypted with your master password.\n'
      txt += 'You can encrypt and decrypt this folder in the password manager when you are logged in'

      fs.writeFile('./encryptedfolder/readme.txt', txt, err => {
        chkErr(err, callbackError)
      })
      callback()
    },

    (callback) => {
      // Create the database folder
      mkdirp('./db', err => {
        chkErr(err, callbackError)
        callback()
      })
    },

    (callback) => {
      // Create the actual database
      db.create((err) => {
        chkErr(err, callbackError)
        callback()
      })
    },

    (callback) => {
      // First time the salt database has been created, lets populate it with all the CSPRNG functions from crypto
      if (db.name === 'salt') {
        db.post({salt: crypto.generateSalt(), hmac: crypto.generateHMAC()}, (err, data) => {
          chkErr(err, callbackError)
        })
      }
    },
  ])
}

// Get the encrypted folder state
exports.getEncryptedState = cb => {
  const tmpDir = path.join(os.tmpdir(), 'passwordapp')
  try {
    fs.accessSync(path.join(tmpDir, 'IV'))
  } catch (e) {
    if (e.code != 'ENOENT') {
      cb(e)
      return
    }

    return 0
  }

  try {
    fs.accessSync('./encryptedfolder/encrypted')
  } catch (e) {
    if (e.code == 'ENOENT')
      return 0
  }

  return 1
}

// Get all password data from database
exports.getPasswords = cb => {
  let passwords = electron.db.passwords.allSync()
  const time = new timer()

  for (let i = 0; i < passwords.length; i++) {
    async.parallel({
      password: function(callback) {
        crypto.decryptString(passwords[i].password, (err, decrypted) => {
          callback(err, decrypted)
        })
      },

      email: function(callback) {
        crypto.decryptString(passwords[i].email, (err, decrypted) => {
          callback(err, decrypted)
        })
      },

      service: function(callback) {
        crypto.decryptString(passwords[i].service, (err, decrypted) => {
          callback(err, decrypted)
        })
      },
    },
    function(err, decrypted) {
      passwords[i].password = decrypted.password
      passwords[i].email = decrypted.email
      passwords[i].service = decrypted.service
    })
  }

  const timerStop = time.stop()
  if (passwords.length >= 1) {
    const str = {
      one: 'Decrypted all data in '  + timerStop + 'ms',
      two: '(' + Math.round(timerStop / passwords.length) + 'ms per data)',
    }
    electron.log(str.one + str.two)
  }

  return passwords
}

exports.loginContinue = (event, data) => {
  // Bind the event variable to electron main variable on start
  electron.event = event

  // Generate rsa and pub
  crypto.generateKey(data.pass, () => {
    data = null // Attempt to null it out of memory :P?

    let firstResult = electron.db.passwords.allSync()

    // Check if new account
    if (firstResult.length == 0) {
      exports.sendMsg(event, true, [
        'Login',
        'Account created, You are now logged in',
      ])
      events.loadPage('index', 1.5)
      return // Stop because no results
    }

    // Decrypt one password to check if password is correct
    firstResult = firstResult[0]
    crypto.decryptString(firstResult.password, (err, decrypted) => {
      if (err === 'HMAC TAMPER') {
        exports.sendMsg(event, false, [
          'Corrupt Database',
          'Your password database is corrupt',
        ])
        return
      }

      if (err === 'DECRYPT FAIL') {
        exports.sendMsg(event, false, [
          'Wrong Password',
          'Supplied credentials are invalid, please try again.',
        ])
        return
      }

      chkErr(err, callbackError)
      exports.sendMsg(event, true, [
        'Login Successful',
        'Welcome!',
      ])
      events.loadPage('index', 1.5)
    })
  })
}

// Desktop notifcations
exports.sendMsg = (event, result, msgData, extra) => {
  const title = msgData[0]
  const message = msgData[1]
  let type = 'error'
  if (result) {
    type = 'success'
  }

  event.sender.send('reply', {
    result: result,
    humane: {
      title: title,
      msg: message,
      type: type,
      extra: extra,
    },
  })
}
