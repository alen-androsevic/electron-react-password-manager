'use strict'

const crypto     = require('crypto')
const timer      = require('./timer')
const macaddress = require('macaddress')

let electron

exports.init = a => {
  electron = a
}

// How the secret key is generated
exports.generateKey = (passphrase, cb) => {
  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let pepper     = electron.db.salt.allSync()[0].pepper
  let iterations = electron.crypt.pbkd2f.iterations
  let bytes      = electron.crypt.pbkd2f.bytes

  electron.log('AES Encryption Level: ' + electron.crypt.bits + 'bits')
  electron.log('PBKDF2 Iterations: ' + iterations.toLocaleString('en-US'))
  electron.log('PBKDF2 Key Bytes: ' + bytes)
  electron.log('CSPRNG Salt(' + salt.length + ')')

  let time = new timer()
  const pbkdf2Salt = crypto.createHash('sha512').update(pepper + passphrase + salt).digest(electron.crypt.encryptMethod)

  electron.log('Pepper Hash (' + pepper.length + ')')
  electron.log('PBKDF2 Salt Hash (' + pbkdf2Salt.length + ')')

  crypto.pbkdf2(passphrase, pbkdf2Salt, iterations, bytes, 'sha512', (err, hash) => {
    if (err)
      cb(err)

    hash = hash.toString(electron.crypt.encryptMethod)

    // Sha256 the hash so we can use it with aes-256 as the key (else we get invalid key length)
    electron.hash = crypto.createHash('sha256').update(hash).digest()

    electron.log('PBKDF2(' + hash.length + ') Complete: ' + time.stop() + 'ms')
    cb()
  })
}

// Generate a unique pepper for this computer
exports.generatePepper = (salt, cb) => {
  // No database values have been created by the user yet, so these values will be from the program defaults
  let iterations = electron.crypt.pbkd2f.iterations
  let bytes      = electron.crypt.pbkd2f.bytes

  // We generate a pepper from the users mac address
  macaddress.one(function(err, mac) {
    // And pbkdf2 sync it with half the iteration and bytes length of the program defaults
    let pepperHash = crypto.pbkdf2Sync(mac, salt, iterations / 2, bytes / 2, 'sha512')
    cb(null, pepperHash.toString(electron.crypt.encryptMethod))
  })
}

// CSPRNG salt
exports.generateSalt = () => {
  return crypto.randomBytes(electron.crypt.salt.randomBytes).toString(electron.crypt.encryptMethod)
}

// HMAC key generation
exports.generateHMAC = () => {
  return crypto.randomBytes(32).toString(electron.crypt.encryptMethod)
}

// How we decrypt strings
exports.decryptString = (string, cb) => {
  // Get the cipher blob data
  let cipherBlob = string.split('$')
  let cipherText = cipherBlob[0]
  let IV = new Buffer(cipherBlob[1], electron.crypt.encryptMethod)
  let hmac = cipherBlob[2]

  // Get the stored HMAC secret
  // And create a HMAC from the secret with the ciphertext and IV
  let chmac = crypto.createHmac('sha512', electron.db.salt.allSync()[0].hmac)
  chmac.update(cipherText)
  chmac.update(IV.toString(electron.crypt.encryptMethod))

  // Set some variables for checking later on
  let thisHmac = chmac.digest(electron.crypt.encryptMethod)
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

  // Create the decipher
  let decryptor = crypto.createDecipheriv('aes-' + electron.crypt.bits + '-cbc', electron.hash, IV)

  // Decrypt the ciphertext
  let plaintext = decryptor.update(cipherText, electron.crypt.encryptMethod, electron.crypt.decryptMethod)
  try {
    plaintext += decryptor.final(electron.crypt.decryptMethod)
  } catch (e) {
    if(e.toString().indexOf('EVP_DecryptFinal_ex:bad decrypt') >= 1) {
      cb('WRONG PASSWORD')
      return
    }else{
      cb(e, null)
      return
    }
  }

  cb(null, plaintext)
}

// How we encrypt strings
exports.encryptString = (string, cb) => {
  // Use CSPRNG to generate unique bytes for the IV
  let IV = new Buffer(crypto.randomBytes(16))

  // Create the cipher
  let encryptor = crypto.createCipheriv('aes-' + electron.crypt.bits + '-cbc', electron.hash, IV)

  // Encrypt the string
  var cipherText = encryptor.update(string, electron.crypt.decryptMethod, electron.crypt.encryptMethod)
  cipherText += encryptor.final(electron.crypt.encryptMethod)

  // Create the HMAC
  let hmac = crypto.createHmac('sha512',  electron.db.salt.allSync()[0].hmac)
  hmac.update(cipherText)
  hmac.update(IV.toString(electron.crypt.encryptMethod))

  cb(null, cipherText + '$' + IV.toString(electron.crypt.encryptMethod) + '$' + hmac.digest(electron.crypt.encryptMethod))
}
