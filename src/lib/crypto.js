'use strict'

const crypto     = require('crypto')
const timer      = require('./timer')
const spawn      = require('threads').spawn
const macaddress = require('macaddress')

let electron

exports.init = a => {
  electron = a
}

// Generates the encryption keys used to decrypt and encrypt everything
exports.generateKey = (passphrase, cb) => {
  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations
  let len        = electron.crypt.pbkd2f.count

  electron.log('AES Encryption Level: ' + electron.crypt.bits + 'bits')
  electron.log('PBKDF2 Iterations: ' + iterations.toLocaleString('en-US'))
  electron.log('PBKDF2 Key Length: ' + len)
  electron.log('CSPRNG Salt(' + salt.length + ')')

  let time = new timer()
  exports.generatePepper(function(err, pepper) {
    if (err)
      throw new Error(err)

    const peppersaltpass = crypto.createHash('sha512').update(pepper + passphrase + salt).digest('hex')

    electron.log('Pepper Hash (' + pepper.length + ')')
    electron.log('Pepper + Passphrase + Salt Hashed (' + peppersaltpass.length + ')')

    crypto.pbkdf2(passphrase, peppersaltpass, iterations, len, 'sha512', (err, hash) => {
      if (err)
        throw err

      electron.hash = hash
      electron.log('PBKDF2 Hash(' + hash.toString('hex').length + ') Complete: ' + time.stop() + 'ms')
      cb()
    })
  })
}

// Generate a unique pepper for this computer
exports.generatePepper = cb => {
  macaddress.one(function(err, mac) {
    const pepper = crypto.createHash('sha512').update(mac).digest('hex')
    electron.log('Pepper Raw (' + mac.length + ')')
    cb(null, pepper)
  })
}

// Cryptographically secure pseudorandom number generator
exports.generateSalt = () => {
  return crypto.randomBytes(electron.crypt.salt.randomBytes).toString('hex')
}

// Using crypto to encrypt strings
exports.encryptString = (string, cb) => {
  let cipher = crypto.createCipher('aes-' + electron.crypt.bits + '-cbc', electron.hash)
  let encrypted = cipher.update(string, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  cb(null, encrypted)
}

// Using crypto to decrypt strings
exports.decryptString = (string, cb) => {
  let decipher = crypto.createDecipher('aes-' + electron.crypt.bits + '-cbc', electron.hash)
  let decrypted = decipher.update(string, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  cb(null, decrypted)
}
