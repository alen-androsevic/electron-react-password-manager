const crypto = require('./crypto')
const events = require('./events')
const timer = require('./timer')

exports.init = (a, cb) => {
  const electron = a
  
  crypto.init(electron)
  
  // Check if the passwords database exists, create if not.
  electron.db.passwords.exists(function (exists) {
    electron.firstTime = false
    if (!exists){
      electron.firstTime = true
      electron.db.passwords.create(function (err) {
        if (err) cb(err)
        electron.db.salt.create(function (err) {
          if (err) cb(err)
          electron.db.salt.post({salt:crypto.generateSalt()}, (err, data) => {
            if (err) cb(err)
          })
        })
      })
    }
  })

  electron.ipcMain.on('login', (event, passInput) => {
    crypto.generateKey(passInput)
    passInput = null; // Attempt to null it out of memory :P?
    
    let firstResult = electron.db.passwords.allSync()
    
    if(firstResult.length == 0){
      exports.sendMsg(event, true, "Account created, logging in.")
      events.loadPage('index')
      return // stop because no results 
    }
    firstResult = firstResult[0]
    crypto.decryptString(firstResult.password, electron.encryption.rsa, (err, decrypted) => {
      if(err) cb(err)
      if(decrypted === "�w^~)�"){
        exports.sendMsg(event, false, "Wrong password!")
        return // stop because string is still encrypted
      }
      exports.sendMsg(event, true, "Login succeeded, please wait..")
      events.loadPage('index')
    }) 
  })
   
  electron.ipcMain.on('addService', (event, post) => {
    crypto.encryptString(post.password, electron.encryption.pub, (err, encrypted) => {
      if(err) cb(err)
      post.password = encrypted
      electron.db.passwords.post(post, (err, data) =>{
        if(err) cb(err)
        exports.sendMsg(event, true,"Password added!",{id:data})
      })
    })
  })
   
  electron.ipcMain.on('deleteService', (event, id) => {
    electron.db.passwords.delete(id)
    exports.sendMsg(event, true,"Password removed!",{removedid:id})
  })

  electron.ipcMain.on('populateTable',  (event) => {
    let passwords = electron.db.passwords.allSync()
    if(passwords.length >= 1) time = new timer() 
    for(i=0;i<passwords.length;i++){
      crypto.decryptString(passwords[i].password, electron.encryption.rsa, (err, decrypted) => {
        if(err) cb(err)
        passwords[i].password = decrypted 
      })
    }
    if(passwords.length >= 1) timerStop = time.stop()
    if(passwords.length >= 1) electron.log("Decrypted all passwords in " + timerStop + "ms (" + Math.round(timerStop / passwords.length) +"ms per password)")
    event.sender.send('passtable', passwords)
  })
}

exports.sendMsg = (event, result, message, extra) => {
  let msg = {
    result: result, 
    humane: {
      title: "Password App",
      msg: message,
      extra: extra
    }
  }
  event.sender.send('reply', msg)
}