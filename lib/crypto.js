const cryptico = require('cryptico')
const base64 = require('js-base64').Base64

let electron

exports.init = a => {
  electron = a
}

exports.generateKey = passphrase => {
  let preHash = process.env.APPDATA
  preHash += process.env.COMPUTERNAME
  preHash += process.env.HOSTNAME
  preHash += process.env.PROCESSOR_IDENTIFIER
  
  let sufHash = process.env.APPDATA
  sufHash += process.env.HOMEDRIVE
  sufHash += process.env.HOMEPATH
  sufHash += process.env.OS
  
  const hash = base64.encode(electron.mac) + base64.encode(preHash) + base64.encode(passphrase) + base64.encode(sufHash)
  
  const rsa = exports.generateRsa(hash)
  
  electron.encryption = {
    rsa: rsa,
    pub: exports.generatePublic(rsa)
  }
}

exports.generateRsa = input => {
  let bits = 2048
  if(electron.dev) bits = 512
  return cryptico.generateRSAKey(input, bits)
}

exports.generatePublic = input => {
  return cryptico.publicKeyString(input)
}

exports.encryptString = (string, publickey, cb) => {
  let encrypted = cryptico.encrypt(base64.encode(string), publickey)
  if(encrypted) if(encrypted.status) if(encrypted.status == "Invalid public key") cb(encrypted.status)
  if(cb) cb(null, encrypted.cipher)
}  

exports.decryptString = (string, privatekey, cb) => {
  let decrypted = cryptico.decrypt(string, privatekey)
  if(cb) cb(null, base64.decode(decrypted.plaintext)) 
}  