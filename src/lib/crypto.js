'use strict'

const crypto     = require('crypto')
const timer      = require('./timer')
const spawn      = require('threads').spawn
const macaddress = require('macaddress')

let electron

exports.init = a => {
  electron = a
}

// How the secret key is generated
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
        cb(err)

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

// How we decrypt strings
exports.decryptString = (string, cb) => {
  // Get the cipher blob data
  let cipherBlob = string.split('$')
  let cipherText = cipherBlob[0]
  let IV = new Buffer(cipherBlob[1], 'hex')
  let hmac = cipherBlob[2]

  // Get the stored HMAC secret (which does not have to be secret at all for our data to be secure)
  // And create a HMAC from the secret with the ciphertext and IV
  let chmac = crypto.createHmac('sha256', electron.db.salt.allSync()[0].hmac)
  chmac.update(cipherText)
  chmac.update(IV.toString('hex'))

  // Then compare the two HMAC values
  let thisHmac = chmac.digest('hex')
  let thatHmac = hmac
  let noCorruption

  // Check for data corruption
  for (var i = 0; i <= (thisHmac.length - 1); i++) {
    noCorruption |= thisHmac.charCodeAt(i) ^ thatHmac.charCodeAt(i)
  }

  // Should be equal
  if (thisHmac !== thatHmac || noCorruption === 1) {
    // TODO: exception: login, create 2 services, exit program, tamper with the last password db file, re-open program: no errors
    electron.log(' --- HMAC TAMPERING!')
    cb('HMAC TAMPER')
    return
  }

  // Sha256 the hash so we can use it with aes-256 as the key (else we get invalid key length)
  let hash = crypto.createHash('sha256').update(electron.hash).digest()

  // Create the decipher
  let decryptor = crypto.createDecipheriv('aes-' + electron.crypt.bits + '-cbc', hash, IV)

  // Decrypt the ciphertext
  let plaintext = decryptor.update(cipherText, 'hex', 'utf-8')
  plaintext += decryptor.final('utf-8')

  cb(null, plaintext)
}

// How we encrypt strings
exports.encryptString = (string, cb) => {
  // Use CSPRNG to generate unique bytes for the IV
  let IV = new Buffer(crypto.randomBytes(16))

  // Sha256 the hash so we can use it with aes-256 as the key (else we get invalid key length)
  let hash = crypto.createHash('sha256').update(electron.hash).digest()

  // Create the cipher
  let encryptor = crypto.createCipheriv('aes-' + electron.crypt.bits + '-cbc', hash, IV)

  // Encrypt the string
  var cipherText = encryptor.update(string, 'utf8', 'hex')
  cipherText += encryptor.final('hex')

  // Create the HMAC
  let hmac = crypto.createHmac('sha256',  electron.db.salt.allSync()[0].hmac)
  hmac.update(cipherText)
  hmac.update(IV.toString('hex'))

  cb(null, cipherText + '$' + IV.toString('hex') + '$' + hmac.digest('hex'))
}
