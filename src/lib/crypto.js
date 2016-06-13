'use strict'

const crypto         = require('crypto')
const timer          = require('./timer')
const macaddress     = require('macaddress')
const chkErr         = require('./error').chkErr
const glob           = require('glob')
const path           = require('path')
const fs             = require('fs')
const os             = require('os')
const stream         = require('stream')
const CombinedStream = require('combined-stream')
const machineUUID    = require('machine-uuid')

let electron

exports.init = a => {
  electron = a
}

// How the secret key is generated
exports.generateKey = (passphrase, cb) => {
  electron.crypt = electron.db.encryption.allSync()[0]
  let salt       = electron.db.salt.allSync()[0].salt
  let iterations = electron.crypt.pbkd2f.iterations

  electron.log('AES Encryption Level: ' + electron.crypt.bits + 'bits')
  electron.log('PBKDF2 Iterations: ' + iterations.toLocaleString('en-US'))
  electron.log('PBKDF2 Key Bytes: ' + electron.crypt.bits / 16)
  electron.log('CSPRNG Salt(' + salt.length + ')')

  exports.generatePepper(salt, (err, pepper) => {
    chkErr(err, cb)

    let time = new timer()
    const pbkdf2Salt = crypto.createHash('sha512').update(pepper + passphrase + salt).digest(electron.crypt.encryptMethod)
    electron.log('PBKDF2 Salt Hash(' + pbkdf2Salt.length + ')')

    crypto.pbkdf2(passphrase, pbkdf2Salt, iterations, electron.crypt.bits / 16, 'sha512', (err, hash) => {
      chkErr(err, cb)
      electron.hash = hash.toString(electron.crypt.encryptMethod)
      console.log(electron.hash.length,"-",electron.hash)
      electron.log('PBKDF2(' + electron.hash.length + ') Complete: ' + time.stop() + 'ms')
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

  // We generate a pepper from the users mac address and machine uuid
  machineUUID(uuid => {
    macaddress.one(function(err, mac) {
      let pepper = mac + '$' + uuid
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
  glob('./encryptedfolder/**', {}, function(er, files) {
    let removeFiles = []

    for (let i in files) {
      // Skip if directories
      if (fs.lstatSync(files[i]).isDirectory())
        continue

      // Create the cipher for each file so the IV is randomized
      let cipher = exports.generateCipher()

      // Create the read/write stream and pipe output
      const input = fs.createReadStream(files[i])

      // Mark file for deletion
      removeFiles.push(files[i])

      // Prepend IV to filename
      let splitted = files[i].split('/')
      let originalFilename = splitted[splitted.length - 1]
      let filename = cipher.IV.toString('hex')
      splitted.pop()
      let filepath = splitted.join('/')
      files[i] = path.join(filepath, filename)

      // Prepend filename to first line of the document
      var prependFilename = new stream.Readable()
      prependFilename.push(originalFilename + '\n')
      prependFilename.push(null)
      var combinedStream = CombinedStream.create()
      combinedStream.append(prependFilename)
      combinedStream.append(input)

      // Pipe to write stream
      const output = fs.createWriteStream(files[i])
      const streamer = combinedStream.pipe(cipher.encrypt).pipe(output)
    }

    for (let i in removeFiles) {
      fs.unlink(removeFiles[i])
    }

    cb()
  })
}

// How we decrypt folders
exports.decryptFolder = cb => {
  glob('./encryptedfolder/**', {}, function(er, files) {
    let removeFiles = []

    for (let i in files) {
      // Skip if directories
      if (fs.lstatSync(files[i]).isDirectory())
        continue

      // Make sure we are dealing with filenames without extensions (these are encrypted)
      if (path.extname(files[i]))
        continue

      // The file should not be in the process of being decrypted
      if (files[i].indexOf('decrypting_') >= 1)
        continue

      // Create the read stream
      const input = fs.createReadStream(files[i])

      // Mark files for removal
      removeFiles.push(files[i])

      // Remove IV from filename
      let splitted = files[i].split('/')
      let IV = splitted[splitted.length - 1]
      IV = new Buffer(IV, electron.crypt.encryptMethod)
      splitted.pop()
      let filepath = splitted.join('/')
      let randomBytes = crypto.randomBytes(electron.crypt.salt.randomBytes).toString(electron.crypt.encryptMethod)
      let specialSnowflake = crypto.createHash('md5').update(randomBytes).digest(electron.crypt.encryptMethod)
      let filename = 'decrypting_' + specialSnowflake
      files[i] = path.join(filepath, filename)

      // Create the cipher from the stored IV
      let cipher = exports.generateCipher(IV)

      // First step is to just decrypt the whole document
      const output = fs.createWriteStream(files[i])
      const stream = input.pipe(cipher.decrypt).pipe(output)

      // Then lets read the first line of the decrypted document
      // This is the original filename
      stream.on('finish', function() {
        const decryptedDocument = fs.createReadStream(files[i])
        let decryptedFilename

        decryptedDocument.on('data', data => {
          // Read the first line
          decryptedFilename = data.toString('utf-8').split('\n')[0]

          // And restore the original filename
          fs.rename(path.join(filepath, filename), path.join(filepath, 'decrypted_' + decryptedFilename), function(err) {
            chkErr(err, cb)
          })

          // This is all we need really, lets stop reading the file
          decryptedDocument.destroy()
        })

        // TODO: find out why the decryptedDocment.on('finish') does not work here
        // This temp workaround is a ugly settimeout, which is risky for large files
        setTimeout(() => {
          let input = fs.createReadStream(path.join(filepath, 'decrypted_' + decryptedFilename))
          let output = fs.createWriteStream(path.join(filepath, decryptedFilename))
          let finalstream = input.pipe(RemoveFirstLine()).pipe(output)

          // Remove the first decrypted document, because it contains metadata
          finalstream.on('finish', () => {
            fs.unlink(path.join(filepath, 'decrypted_' + decryptedFilename))
          })
        }, 1500)
      })
    }

    for (let i in removeFiles) {
      fs.unlink(removeFiles[i])
    }

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

// TODO: put this in a module, it's ugly and doesn't belong in crypto.js
const Transform = require('stream').Transform
const util      = require('util')
function RemoveFirstLine(args) {
  if (!(this instanceof RemoveFirstLine)) {
    return new RemoveFirstLine(args)
  }

  Transform.call(this, args)
  this._buff = ''
  this._removed = false
}

util.inherits(RemoveFirstLine, Transform)

RemoveFirstLine.prototype._transform = function(chunk, encoding, done) {
  if (this._removed) { // If already removed
    this.push(chunk) // Just push through buffer
  } else {
    // Collect string into buffer
    this._buff += chunk.toString()

    // Check if string has newline symbol
    if (this._buff.indexOf('\n') !== -1) {

      // Push to stream skipping first line
      this.push(this._buff.slice(this._buff.indexOf('\n') + 1))

      // Clear string buffer
      this._buff = null

      // Mark as removed
      this._removed = true
    }
  }

  done()
}
