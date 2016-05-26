const cryptico = require('cryptico')
const base64 = require('js-base64').Base64
const pbkd2f = require('pbkdf2')
const supersalt = require('./supersalt')
const timer = require('./timer')

let electron

exports.init = a => {
  electron = a
}

exports.generateSalt = () => {
  return supersalt.generate(electron.crypt.supersalt.saltLen,electron.crypt.supersalt.maxpos);
}

exports.generateKey = passphrase => {
  let time
  let Totaltime = new timer()
  
  let salt = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations
  let len = electron.crypt.pbkd2f.count 
  electron.log("Start key generation")
  electron.log("RSA encryption level: " + electron.crypt.bits + "bits");
  electron.log("pbkd2f iterations: " + iterations.toLocaleString('en-US'));
  electron.log("pbkd2f length: " + len);
  electron.log("Application salt(" + salt.length + ")")
  
  // Build the hash
  time = new timer()
  let hash = base64.encode(pbkd2f.pbkdf2Sync(passphrase, salt, iterations, len, 'sha512').toString('hex'))
  electron.log("pbkd2f hash(" + hash.length + ") complete: " + time.stop() + "ms")
  
  // Generate the RSA
  time = new timer()
  const rsa = exports.generateRsa(hash)
  const pub = exports.generatePublic(rsa)
  electron.log("RSA key complete: " + time.stop() + "ms")
  electron.log("Key generation complete: " + Totaltime.stop() + "ms total")
  
  electron.encryption = {
    rsa: rsa,
    pub: pub
  }
}

exports.generateRsa = input => {
  return cryptico.generateRSAKey(input, electron.crypt.bits)
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