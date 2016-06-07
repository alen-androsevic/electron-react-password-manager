'use strict'

const cryptico = require('cryptico-js')
const base64   = require('js-base64').Base64
const pbkd2f   = require('pbkdf2')
const timer    = require('./timer')
const spawn    = require('threads').spawn

let electron

exports.init = a => {
  electron = a
}

// Generates a one time application salt
exports.generateSalt = () => {
  return exports.generateSuperSalt(electron.crypt.supersalt.saltLen, electron.crypt.supersalt.maxpos)
}

// Generates the encryption keys used to decrypt and encrypt everything
exports.generateKey = (passphrase, cb) => {
  let time
  let Totaltime = new timer()

  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations
  let len        = electron.crypt.pbkd2f.count

  electron.log('Start key generation')
  electron.log('RSA encryption level: ' + electron.crypt.bits + 'bits')
  electron.log('pbkd2f iterations: ' + iterations.toLocaleString('en-US'))
  electron.log('pbkd2f length: ' + len)
  electron.log('Application salt(' + salt.length + ')')

  // Build the hash in a thead
  time = new timer()
  exports.buildHash(passphrase, salt, iterations, len, 'sha512', (hash) => {
    electron.log('pbkd2f hash(' + hash.length + ') complete: ' + time.stop() + 'ms')

    // Generate the RSA in a thead
    time = new timer()
    exports.generateRSA(hash, RSAresults => {
      electron.log('RSA key complete: ' + time.stop() + 'ms')
      electron.log('Key pair generation complete: ' + Totaltime.stop() + 'ms total')
      electron.encryption = {
        rsa: RSAresults.rsa,
        pub: RSAresults.pub,
      }

      cb()
    })
  })
}

// The generateRSA function running in a thread
exports.generateRSA = (hash, cb) => {
  // TODO: find a way to make this work in threads
  const thread = spawn(function(input, done) {
    const cryptico = require('cryptico')
    const rsa = cryptico.generateRSAKey(input.hash, input.electron.crypt.bits)
    const pub = cryptico.publicKeyString(rsa)
    done({rsa, pub})
  })

  thread.send({electron, hash})
  .on('message', function(response) {
    cb({rsa: response.rsa, pub: response.pub})
    thread.kill()
  })
  .on('error', function(error) {
    throw new Error('Worker errored:', error)
  })
}

// The build hash function running in a thread
exports.buildHash = (passphrase, salt, iterations, len, hashmethod, cb) => {
  const thread = spawn(function(input, done) {
    const base64 = require('js-base64').Base64
    const pbkd2f = require('pbkdf2')
    let hash     = pbkd2f.pbkdf2Sync(input.passphrase, input.salt, input.iterations, input.len, input.hashmethod)
    hash         = hash.toString('hex')
    done({hash})
  })

  thread.send({passphrase, salt, iterations, len, hashmethod})
  .on('message', function(response) {
    cb(response.hash)
    thread.kill()
  })
  .on('error', function(err) {
    throw new Error(err)
  })
}

// Can generate 'super' salts (random characters) from all character codes
exports.generateSuperSalt = (amount, maxpos) => {
  let salt = ''
  let chars = ''
  for (let i = 32; i < maxpos; i++) chars += String.fromCharCode(i)
  for (let i = 0; i < amount; i++) salt += chars.charAt(Math.floor(Math.random() * chars.length))
  return salt
}

// Using cryptico to encrypt strings in a thread
exports.encryptString = (string, publickey, cb) => {
  const thread = spawn(function(input, done) {
    const cryptico = require('cryptico')
    const base64   = require('js-base64').Base64
    let encrypted = cryptico.encrypt(base64.encode(input.string), input.publickey)
    done({encrypted})
  })

  thread.send({string, publickey})
  .on('message', function(response) {
    if (response.encrypted)
      if (response.encrypted.status)
        if (response.encrypted.status == 'Invalid public key')
          cb(response.encrypted.status)
    cb(null, response.encrypted.cipher)
    thread.kill()
  })
  .on('error', function(err) {
    throw new Error(err)
  })
}

// Using cryptico to decrypt strings in a thread
exports.decryptString = (string, privatekey, cb) => {
  const cryptico = require('cryptico')
  let decrypted = cryptico.decrypt(string, privatekey)
  const thread = spawn(function(input, done) {
    const cryptico = require('cryptico')
    let decrypted = cryptico.decrypt(input.string, input.privatekey)
    done({hash})
  })

  thread.send({string, privatekey})
  .on('message', function(response) {
    cb(null, base64.decode(response.plaintext))
    thread.kill()
  })
  .on('error', function(err) {
    throw new Error(err)
  })
}
