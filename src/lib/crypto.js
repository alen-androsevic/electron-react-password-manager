'use strict'

const crypto         = require('crypto')
const timer          = require('./timer')
const macaddress     = require('macaddress')
const chkErr         = require('./error').chkErr
const glob           = require('glob')
const path           = require('path')
const fs             = require('fs')
const stream         = require('stream')
const CombinedStream = require('combined-stream')
const machineUUID    = require('machine-uuid')
const async          = require('async')
const zipdir         = require('zip-dir')
const unzip          = require('unzip')
let electron

exports.init = a => {
  electron = a
}

// How the secret key is generated
exports.generateKey = (passphrase, cb) => {
  let time       = new timer()
  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations

  electron.log('AES Encryption Level: ' + electron.crypt.bits + 'bits')
  electron.log('PBKDF2 Iterations: '    + iterations.toLocaleString('en-US'))
  electron.log('CSPRNG Salt('           + salt.length + ')')

  async.waterfall([
    // Generate the pepper
    (callback) => {
      exports.generatePepper((err, pepper) => {
        callback(null, pepper)
      })
    },
    // And key derive before sha512'ing the password
    (pepper, callback) => {
      let password = pepper + passphrase
      crypto.pbkdf2(password, salt, iterations, electron.crypt.bits / 16, 'sha512', (err, hash) => {
        chkErr(err, cb)
        electron.hash = hash.toString(electron.crypt.encryptMethod)
        electron.log('Secret Key Hash(' + electron.hash.length + ') Complete: ' + time.stop() + 'ms')
        password = null
        hash = null
        cb()
      })
    },
  ])
}

// Generate a unique pepper for this computer
exports.generatePepper = cb => {
  // We generate a pepper from the users mac address and machine uuid
  machineUUID(uuid => {
    macaddress.one((err, mac) => {
      let pepper = mac + uuid
      cb(null, pepper)
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
// TODO: Try to have one pipe for the whole operation, not sure if this is even possible
exports.encryptFolder = cb => {
  glob('./encryptedfolder/**', {}, (err, files) => {
    chkErr(err, cb)
    let removeFiles = []

    // Create the cipher for the zip so the IV is randomized
    let cipher = exports.generateCiphers()

    zipdir('./encryptedfolder', {
      saveTo: './encryptedfolder/zipped.zip',
    }, function(err, buffer) {
      if (err)
        throw new Error(err)

      for (let i in files) {
        // Mark file for deletion
        removeFiles.push(files[i])
      }

      fs.writeFile('./encryptedfolder/metakappa', cipher.IV, () => {
        const input = fs.createReadStream('./encryptedfolder/zipped.zip')
        const output = fs.createWriteStream('./encryptedfolder/encrypted.zip')
        const streamer = input.pipe(cipher.encrypt).pipe(output)

        streamer.on('finish', function() {
          for (let i in removeFiles) {
            // Skip if directories
            if (fs.lstatSync(files[i]).isDirectory())
              continue

            fs.unlink(removeFiles[i])
          }

          fs.unlink('./encryptedfolder/zipped.zip')

          cb()
        })
      })
    })
  })
}

// How we decrypt folders
exports.decryptFolder = cb => {
  glob('./encryptedfolder/**', {}, (err, files) => {
    chkErr(err, cb)

    // Create the cipher from the stored IV
    let cipher = exports.generateCiphers(fs.readFileSync('./encryptedfolder/metakappa'))

    // Create the read stream
    const input = fs.createReadStream('./encryptedfolder/encrypted.zip')

    // First step is to just decrypt the whole zip
    const output = fs.createWriteStream('./encryptedfolder/zipped.zip')
    const stream = input.pipe(cipher.decrypt).pipe(output)

    stream.on('finish', () => {
      fs.unlink('./encryptedfolder/encrypted.zip')
      const readstreamer = fs.createReadStream('./encryptedfolder/zipped.zip').pipe(unzip.Extract({ path: './encryptedfolder' }))

      readstreamer.on('finish', () => {
        fs.unlink('./encryptedfolder/zipped.zip')
      })
    })

    cb()
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
  // And create a HMAC from the secret HMAC with the ciphertext and IV
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
  let cipher = exports.generateCiphers(IV)

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
  let cipher = exports.generateCiphers()

  // Encrypt the string
  var cipherText = cipher.encrypt.update(string, electron.crypt.decryptMethod, electron.crypt.encryptMethod)
  cipherText += cipher.encrypt.final(electron.crypt.encryptMethod)

  // Create the HMAC
  let hmac = crypto.createHmac('sha512',  electron.db.salt.allSync()[0].hmac)
  hmac.update(cipherText)
  hmac.update(cipher.IV.toString(electron.crypt.encryptMethod))

  cb(null, cipherText + '$' + cipher.IV.toString(electron.crypt.encryptMethod) + '$' + hmac.digest(electron.crypt.encryptMethod))
}

exports.generateCiphers = importedIV => {
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
