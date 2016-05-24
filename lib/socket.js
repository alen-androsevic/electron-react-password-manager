const crypto = require('./crypto')
const events = require('./events')

let publickey
let key

exports.init = (a, cb) => {
  const electron = a

  electron.ipcMain.on('login', (event, passInput) => {
    key = crypto.generateRsa(passInput)
    publickey = crypto.generatePublic(key)
    
    let firstResult = electron.passwords.allSync()
    
    if(firstResult.length == 0){
      exports.sendMsg(event, true, "Account created, logging in.")
      events.loadPage('index')
      return // stop because no results 
    }
    firstResult = firstResult[0]
    crypto.decryptString(firstResult.password, key, (err, decrypted) => {
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
    crypto.encryptString(post.password, publickey, (err, encrypted) => {
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
      crypto.decryptString(results[i].password, key, (err, decrypted) => {
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