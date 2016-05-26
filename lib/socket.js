const crypto = require('./crypto')
const events = require('./events')
const timer = require('./timer')

let electron

exports.init = (a, cb) => {
  electron = a
  
  crypto.init(electron) 
  
  // Check if the databases exists, create if not.
  electron.db.passwords.exists((exists) => {
    electron.firstTime = false
    if (!exists){
      electron.firstTime = true
      electron.db.passwords.create((err) => {
        if (err) cb(err)
        electron.db.encryption.create((err) => {
          if (err) cb(err)
          electron.db.salt.create((err) => {
            if (err) cb(err)
            electron.db.salt.post({salt:crypto.generateSalt()}, (err, data) => {
              if (err) cb(err)
            })
          })
        })
      })
    }
    if(exists){
      if(electron.db.encryption.allSync().length === 0) electron.firstTime = true
    }
  }) 
   
  // This event is fired when the user has a onReady @ login.html
  electron.ipcMain.on('readylogin', (event) => {
    event.sender.send('firsttime', electron.firstTime)
  })

  // On login
  electron.ipcMain.on('login', (event, data) => {
    
    // Convert to ints
    data.bits = parseInt(data.bits)
    data.pbkd2f.iterations = parseInt(data.pbkd2f.iterations)
    data.pbkd2f.count = parseInt(data.pbkd2f.count)
    
    // Override application data from user settings
    electron.crypt.bits = data.bits
    electron.crypt.pbkd2f.iterations = data.pbkd2f.iterations
    electron.crypt.pbkd2f.count = data.pbkd2f.count
    
    // Check if passwords are same if first time run
    if(electron.firstTime){
      if(data.pass!=data.pass2){
        exports.sendMsg(event, true, "Passwords are not the same!")
        return;
      }
    
      // Save encryption methods to database if run for first time
      electron.db.encryption.post(electron.crypt, (err, dbdata) => {
        if (err) cb(err)
          exports.loginContinue(event,data)
          data = null; // Attempt to null it out of memory :P?
      })
      return // Stop execution because loginContinue will keep it rolling
    }
    exports.loginContinue(event,data)
    data = null; // Attempt to null it out of memory :P?
  }) 
  
  // When a password (service) has been added
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
  
  // When a password (service) has been deleted
  electron.ipcMain.on('deleteService', (event, id) => {
    electron.db.passwords.delete(id)
    exports.sendMsg(event, true,"Password removed!",{removedid:id})
  })

  // When the frontend requests database objects for the password table
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

exports.loginContinue = (event,data) => {
  // Generate rsa and pub
  crypto.generateKey(data.pass) 
  
  data = null; // Attempt to null it out of memory :P?
  
  let firstResult = electron.db.passwords.allSync()
   
  // Check if new account 
  if(firstResult.length == 0){
    exports.sendMsg(event, true, "Account created, logging in.")
    events.loadPage('index')
    return // stop because no results 
  }
  
  // Decrypt one password to check if password is correct
  firstResult = firstResult[0]
  crypto.decryptString(firstResult.password, electron.encryption.rsa, (err, decrypted) => {
    if(err) cb(err)
    if(decrypted === "�w^~)�"){ // for some reason a failed password is    �w^~)�    why? base64?
      exports.sendMsg(event, false, "Wrong password!")
      return // stop because string is still encrypted
    }
    exports.sendMsg(event, true, "Login succeeded, please wait..")
    events.loadPage('index')
  }) 
}

// Desktop notifcations
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