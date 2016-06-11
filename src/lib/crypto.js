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

// CSPRNG salt
exports.generateSalt = () => {
  return crypto.randomBytes(electron.crypt.salt.randomBytes).toString('hex')
}

// HMAC key generation
exports.generateHMAC = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Using crypto to decrypt strings
exports.decryptString = (string, cb) => {
  let cipherBlob = string.split('$')
  let ct = cipherBlob[0]
  let IV = new Buffer(cipherBlob[1], 'hex')
  let hmac = cipherBlob[2]
  let decryptor

  let chmac = crypto.createHmac('sha256', electron.db.salt.allSync()[0].hmac)
  chmac.update(ct)
  chmac.update(IV.toString('hex'))

  let sentinel
  let val1 = chmac.digest('hex')
  let val2 = hmac
  if (val1.length !== val2.length) {
    return false
  }

  for (let i = 0; i <= (val1.length - 1); i++) {
    sentinel |= val1.charCodeAt(i) ^ val2.charCodeAt(i)
  }

  if (sentinel === 0) {
    cb('HMAC TAMPER')
    return
  }

  let hash = crypto.createHash('sha256').update(electron.hash).digest()
  decryptor = crypto.createDecipheriv('aes-' + electron.crypt.bits + '-cbc', hash, IV)
  decryptor.update(ct, 'hex', 'utf-8')
  cb(null, decryptor.final('utf-8'))
}

// Using crypto to encrypt strings
exports.encryptString = (string, cb) => {
  let IV = new Buffer(crypto.randomBytes(16)) // Ensure that the IV (initialization vector) is random
  let cipherText
  let hmac
  let encryptor
  let hash = crypto.createHash('sha256').update(electron.hash).digest()
  encryptor = crypto.createCipheriv('aes-' + electron.crypt.bits + '-cbc', hash, IV)
  encryptor.setEncoding('hex')
  encryptor.write(string)
  encryptor.end()
  cipherText = encryptor.read()
  hmac = crypto.createHmac('sha256',  electron.db.salt.allSync()[0].hmac)
  hmac.update(cipherText)
  hmac.update(IV.toString('hex'))
  cb(null, cipherText + '$' + IV.toString('hex') + '$' + hmac.digest('hex'))
}
