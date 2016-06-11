'use strict'

const crypto     = require('./crypto')
const events     = require('./events')
const timer      = require('./timer')
const chkErr     = require('./error').chkErr
const mkdirp     = require('mkdirp')
const cryptoNode = require('crypto')

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
    electron.crypt.pbkd2f.count      = parseInt(data.pbkd2f.count)

    // Check if passwords are same if first time run
    if (electron.firstTime) {
      if (data.pass != data.pass2) {
        exports.sendMsg(event, true, 'Passwords are not the same!')
        return
      }
      // Save encryption methods to database if run for first time
      electron.db.encryption.post(electron.crypt, (err, dbdata) => {
        chkErr(err, cb)
        exports.loginContinue(event, data)
        data = null // Attempt to null it out of memory :P?
      })
      return // Stop execution because loginContinue will keep it rolling
    }

    exports.loginContinue(event, data)
    data = null // Attempt to null it out of memory :P?
  })


  // When frontend requests encryption data
  electron.ipcMain.on('requestEncryption', (event, data) => {
    event.sender.send('requestEncryption', electron.db.encryption.allSync()[0])
  })

  // When frontend requests index data
  electron.ipcMain.on('indexRender', (event, data) => {
    event.sender.send('indexRender', exports.getPasswords(cb))
  })

  // When a password (service) has been added
  electron.ipcMain.on('addService', (event, post) => {
    crypto.encryptString(post.password, electron.encryption.pub, (err, encrypted) => {
      chkErr(err, cb)
      post.password = encrypted
      electron.db.passwords.post(post, (err, data) => {
        chkErr(err, cb)
        exports.sendMsg(event, true, 'Password added!', {id: data})
      })
    })
  })

  // When a password (service) has been deleted
  electron.ipcMain.on('deleteService', (event, id) => {
    electron.db.passwords.delete(id)
    exports.sendMsg(event, true, 'Password removed!', {removedid: id})
  })
}

// This checks if a database exists and if not creates one, also some custom action for specific databases
exports.createIfNotExists = db => {
  db.exists((exists) => {
    if (exists) {
      if (db.allSync().length === 0) {
        electron.firstTime = true
      }
    } else {
      electron.firstTime = true
      mkdirp('./db', err => {
        db.create((err) => {
          chkErr(err, callbackError)
          if (db.name === 'salt') {
            // First time the salt database has been created, lets populate it with a super salt from crypto
            db.post({salt: crypto.generateSalt()}, (err, data) => {
              chkErr(err, callbackError)
            })
          }
        })
      })
    }
  })
}

// Get all password data from database
exports.getPasswords = cb => {
  let passwords = electron.db.passwords.allSync()
  const time = new timer()

  for (let i = 0; i < passwords.length; i++) {
    crypto.decryptString(passwords[i].password, electron.encryption.rsa, (err, decrypted) => {
      chkErr(err, cb)
      passwords[i].password = decrypted
    })
  }

  const timerStop = time.stop()
  if (passwords.length >= 1) {
    const str = {
      one: 'Decrypted all passwords in '  + timerStop + 'ms',
      two: '(' + Math.round(timerStop / passwords.length) + 'ms per password)',
    }
    electron.log(str.one + str.two)
  }

  return passwords
}

exports.loginContinue = (event, data) => {
  // Generate rsa and pub
  crypto.generateKey(data.pass, () => {
    data = null // Attempt to null it out of memory :P?

    let firstResult = electron.db.passwords.allSync()

    // Check if new account
    if (firstResult.length == 0) {
      exports.sendMsg(event, true, 'Account created, logging in.')
      events.loadPage('index')
      return // Stop because no results
    }

    // Decrypt one password to check if password is correct
    firstResult = firstResult[0]
    crypto.decryptString(firstResult.password, electron.encryption.rsa, (err, decrypted) => {
      chkErr(err, callbackError)
      if (decrypted === '�w^~)�') { // For some reason a failed password is    �w^~)�    why? base64?
        exports.sendMsg(event, false, 'Wrong password!')
        return // Stop because string is still encrypted
      }

      exports.sendMsg(event, true, 'Login succeeded, please wait..')
      events.loadPage('index')
    })
  })
}

// Desktop notifcations
exports.sendMsg = (event, result, message, extra) => {
  let msg = {
    result: result,
    humane: {
      title: 'Password App',
      msg: message,
      extra: extra,
    },
  }
  event.sender.send('reply', msg)
}
