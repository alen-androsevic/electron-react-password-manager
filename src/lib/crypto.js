'use strict'

const crypto     = require('crypto')
const timer      = require('./timer')
const macaddress = require('macaddress')
const chkErr     = require('./error').chkErr
const glob       = require('glob')
const path       = require('path')
const fs         = require('fs')

let electron

exports.init = a => {
  electron = a
}

// How the secret key is generated
exports.generateKey = (passphrase, cb) => {
  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations
  let bytes      = electron.crypt.pbkd2f.bytes

  electron.log('AES Encryption Level: ' + electron.crypt.bits + 'bits')
  electron.log('PBKDF2 Iterations: ' + iterations.toLocaleString('en-US'))
  electron.log('PBKDF2 Key Bytes: ' + bytes)
  electron.log('CSPRNG Salt(' + salt.length + ')')

  exports.generatePepper(salt, (err, pepper) => {
    chkErr(err, cb)

    let time = new timer()
    const pbkdf2Salt = crypto.createHash('sha512').update(pepper + passphrase + salt).digest(electron.crypt.encryptMethod)

    electron.log('PBKDF2 Salt Hash (' + pbkdf2Salt.length + ')')

    crypto.pbkdf2(passphrase, pbkdf2Salt, iterations, bytes, 'sha512', (err, hash) => {
      chkErr(err, cb)

      hash = hash.toString(electron.crypt.encryptMethod)

      // Sha256 the hash so we can use it with aes-256 as the key (else we get invalid key length)
      if (electron.crypt.bits === 256)
        electron.hash = crypto.createHash('sha256').update(hash).digest()

      // PBKDF2 sync the hash so we can use it with aes-128 as the key (else we get invalid key length)
      if (electron.crypt.bits === 128)
        electron.hash = crypto.pbkdf2Sync(hash, pbkdf2Salt, 1, 16, 'sha512')

      electron.log('PBKDF2(' + hash.length + ') Complete: ' + time.stop() + 'ms')
      cb()
    })
  })
}

// Generate a unique pepper for this computer
exports.generatePepper = (salt, cb) => {
  // No database values have been created by the user yet, so these values will be from the program defaults
  let time       = new timer()
  let iterations = electron.crypt.pbkd2f.iterations
  let bytes      = electron.crypt.pbkd2f.bytes

  // We generate a pepper from the users mac address
  macaddress.one(function(err, mac) {
    // And pbkdf2 it with a quarter of the iteration and bytes length of the program defaults
    crypto.pbkdf2(mac, salt, iterations / 4, bytes / 4, 'sha512', (err, pepper) => {
      chkErr(err, cb)
      electron.log('Pepper Hash(' + pepper.length + ') Complete: ' + time.stop() + 'ms')
      cb(null, pepper.toString(electron.crypt.encryptMethod))
    })
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

// How we encrypt folders
exports.encryptFolder = () => {
  glob('./encryptedfolder/**', {}, function(er, files) {
    // Create the cipher
    let cipher = exports.generateCipher()

    for (let i in files) {
      // Check if the blobs are files
      if (!path.extname(files[i]))
        continue

      // Create the read/write stream and pipe output
      const input = fs.createReadStream(files[i])
      const output = fs.createWriteStream(files[i] + '.enc')
      const stream = input.pipe(cipher.encrypt).pipe(output)

      // Remove the unencrypted file on encryption finish
      stream.on('finish', () => {
        fs.unlink(files[i])
      })
    }
  })
}

// How we decrypt folders
exports.decryptFolder = () => {
  glob('./encryptedfolder/**', {}, function(er, files) {
    // Create the cipher
    let cipher = exports.generateCipher()

    for (let i in files) {
      // Check if the blobs are files
      if (!path.extname(files[i]))
        continue

      // Create the read/write stream and pipe output
      const input = fs.createReadStream(files[i])
      const output = fs.createWriteStream(files[i].replace('.enc', ''))
      const stream = input.pipe(cipher.decrypt).pipe(output)

      // Remove the encrypted file on decryption finish
      stream.on('finish', () => {
        fs.unlink(files[i])
      })
    }
  })
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
    cb('HMAC TAMPER', '[ CORRUPT DATA ]')
    return
  }

  // Create the decipher
  let cipher = exports.generateCipher(IV)

  // Decrypt the ciphertext
  let plaintext = cipher.decrypt.update(cipherText, electron.crypt.encryptMethod, electron.crypt.decryptMethod)
  try {
    plaintext += cipher.decrypt.final(electron.crypt.decryptMethod)
  } catch (e) {
    if (e.toString().indexOf('EVP_DecryptFinal_ex:bad decrypt') >= 1) {
      cb('DECRYPT FAIL')
    } else {
      cb(e, null)
    }

    return
  }

  cb(null, plaintext)
}

// How we encrypt strings
exports.encryptString = (string, cb) => {
  // Create the cipher
  let cipher = exports.generateCipher()

  // Encrypt the string
  var cipherText = cipher.encrypt.update(string, electron.crypt.decryptMethod, electron.crypt.encryptMethod)
  cipherText += cipher.encrypt.final(electron.crypt.encryptMethod)

  // Create the HMAC
  let hmac = crypto.createHmac('sha512',  electron.db.salt.allSync()[0].hmac)
  hmac.update(cipherText)
  hmac.update(cipher.IV.toString(electron.crypt.encryptMethod))

  cb(null, cipherText + '$' + cipher.IV.toString(electron.crypt.encryptMethod) + '$' + hmac.digest(electron.crypt.encryptMethod))
}

exports.generateCipher = importedIV => {
  // Use CSPRNG to generate unique bytes for the IV
  let IV = new Buffer(crypto.randomBytes(16))

  // Override IV if specified
  if (importedIV)
    IV = importedIV

  // Create the encryption oracle
  let encrypt = crypto.createCipheriv('aes-' + electron.crypt.bits + '-cbc', electron.hash, IV)

  // Create the decryption oracle
  let decrypt = crypto.createDecipheriv('aes-' + electron.crypt.bits + '-cbc', electron.hash, IV)

  return {
    IV,
    encrypt,
    decrypt,
  }
}
