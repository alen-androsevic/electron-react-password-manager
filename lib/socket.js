const crypto = require('./crypto')
const events = require('./events')

let publickey;
let key;

exports.init = (a, cb) => {
  const electron = a;

  electron.ipcMain.on('login', (event, passInput) => {
    key = crypto.generateRsa(passInput);
    publickey = crypto.generatePublic(key);

    electron.passwords.all((err, results) => {
      if(err) cb(err); 
      for(i in results){
        var firstResult = results[i]
        break
      }
      if(results.length === 0){ 
        exports.sendMsg(event, true, "Account created, logging in.")
        events.loadPage('index')
        return // stop because no results
      }
      crypto.decryptString(firstResult.password, key, (decrypted) => {
        if(!decrypted){
          exports.sendMsg(event, false, "Wrong password!")
          return // stop because string is still encrypted
        }
        exports.sendMsg(event, true, "Login succeeded, please wait..")
        events.loadPage('index')
      })
    })
  })
   
  electron.ipcMain.on('addService', (event, post) => {
    crypto.encryptString(post.password, publickey, (encrypted) => {
      post.password = encrypted
      electron.passwords.save(null, post, (err) => {
        if(err) cb(err);
        exports.sendMsg(event, true,"Password added!")
      })
    })
  })  

  electron.ipcMain.on('populateTable',  (event) => {
    electron.passwords.all((err, results) => {
      if(err) cb(err);
      for(i in results){
        crypto.decryptString(results[i].password, key, (decrypted) => {
          results[i].password = decrypted
        })
      }
      event.sender.send('passtable', results)
    })
  })
}

exports.sendMsg = (event, result, message) => {
  let msg = {
    result: result, 
    humane: {
      title: "Password App",
      msg: message 
    }
  }
  event.sender.send('reply', msg)
}