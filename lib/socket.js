const crypto = require('./crypto')
const events = require('./events')

exports.init = (a, cb) => {
  const electron = a
  
  crypto.init(electron)
  
  // Check if the passwords database exists, create if not.
  electron.passwords.exists(function (exists) {
    electron.firstTime = false
    if (!exists){
     electron.firstTime = true
     electron.passwords.create(function (err) {
        if (err) throw new Error(err)
      });
    }
  });

  electron.ipcMain.on('login', (event, passInput) => {
    crypto.generateKey(passInput)
    
    let firstResult = electron.passwords.allSync()
    
    if(firstResult.length == 0){
      exports.sendMsg(event, true, "Account created, logging in.")
      events.loadPage('index')
      return // stop because no results 
    }
    firstResult = firstResult[0]
    crypto.decryptString(firstResult.password, electron.encryption.rsa, (err, decrypted) => {
      if(err) cb(err)
      if(!decrypted){
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
      electron.passwords.post(post, (err, data) =>{
        if(err) cb(err)
        exports.sendMsg(event, true,"Password added!",{id:data})
      })
    })
  })
   
  electron.ipcMain.on('deleteService', (event, id) => {
    electron.passwords.delete(id)
    exports.sendMsg(event, true,"Password removed!",{removedid:id})
  })

  electron.ipcMain.on('populateTable',  (event) => {
    let results = electron.passwords.allSync()
    for(i=0;i<results.length;i++){
      crypto.decryptString(results[i].password, electron.encryption.rsa, (err, decrypted) => {
        if(err) cb(err)
        results[i].password = decrypted 
      })
    }
    event.sender.send('passtable', results)
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