const cryptico = require('cryptico')

let electron

exports.init = a => {
  electron = a
}

exports.generateKey = passphrase => {
  const rsa = exports.generateRsa(passphrase)
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
  let encrypted = cryptico.encrypt(string, publickey)
  if(encrypted) if(encrypted.status) if(encrypted.status == "Invalid public key") cb(encrypted.status)
  if(cb) cb(null, encrypted.cipher)
}  

exports.decryptString = (string, privatekey, cb) => {
  let decrypted = cryptico.decrypt(string, privatekey)
  if(cb) cb(null, decrypted.plaintext) 
}  