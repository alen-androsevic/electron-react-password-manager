const cryptico = require('cryptico')

exports.generateRsa = (input) => {
  return cryptico.generateRSAKey(input, 2048)
}

exports.generatePublic = (input) => {
  return cryptico.publicKeyString(input)
}

exports.encryptString = (string, publickey, cb) => {
  let encrypted = cryptico.encrypt(string, publickey)
  if(encrypted) if(encrypted.status) if(encrypted.status == "Invalid public key") throw new Error(encrypted.status)
  if(cb) cb(encrypted.cipher)
} 

exports.decryptString = (string, privatekey, cb) => {
  let decrypted = cryptico.decrypt(string, privatekey)
  if(cb) cb(decrypted.plaintext) 
}