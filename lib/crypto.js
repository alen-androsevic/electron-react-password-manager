const cryptico = require('cryptico')
const base64 = require('js-base64').Base64
const pbkd2f = require('pbkdf2')

let electron

exports.init = a => {
  electron = a
}

exports.generateKey = passphrase => {
  // Build the hash
  const salt = passphrase + electron.mac
  let hash = base64.encode(salt + pbkd2f.pbkdf2Sync(passphrase, salt, 300000, 420, 'sha512').toString('hex'))
  
  // Generate the RSA
  const rsa = exports.generateRsa(hash)
  const pub = exports.generatePublic(rsa)
  
  electron.encryption = {
    rsa: rsa,
    pub: pub
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