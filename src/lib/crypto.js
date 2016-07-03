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
const archiver       = require('archiver')
const tar            = require('tar-fs')
const rimraf         = require('rimraf')
const os             = require('os')
const socket         = require('./socket')
const progress       = require('progress-stream')
const getSize        = require('get-folder-size')
const tmpDir         = path.join(os.tmpdir(), 'passwordapp')

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
// TODO: This function (and decryptFolder) is getting messy
exports.encryptFolder = cb => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
  }

  fs.access(path.join(tmpDir, 'IV'), fs.F_OK, function(err) {
    if (!err) {
      fs.access('./encryptedfolder/encrypted', fs.F_OK, function(err) {
        if (!err) {
          cb('error, already encrypted')
        } else {
          fs.unlink(path.join(tmpDir, 'IV'))
          exports.encryptFolderProcess(cb)
        }
      })
    } else {
      exports.encryptFolderProcess(cb)
    }
  })
}

exports.encryptFolderProcess = cb => {
  electron.event.sender.send('progressData', {progress: '0', title: 'Encrypting', desc: '(1/5) Starting Job'})
  getSize('./encryptedfolder', function(err, totalFolderSize) {
    chkErr(err, cb)

    // Snapshot the entire directory
    glob('./encryptedfolder/**', {}, (err, files) => {
      chkErr(err, cb)

      electron.event.sender.send('progressData', {progress: '0', title: 'Encrypting', desc: '(2/5) Generating Ciphers'})

      // Create the cipher for the tar process this ensures the IV is randomized
      let cipher = exports.generateCiphers()

      // Tar options
      const archive = archiver('tar')

      // Bulk archive these files
      archive.bulk([{
          expand: true, cwd: './encryptedfolder', src: ['**/*'],
        },
      ])

      archive.finalize()

      // Create the initial un-encrypted write stream
      const output = fs.createWriteStream(path.join(tmpDir, 'tar'))

      archive.on('error', function(err) {
        chkErr(err, cb)
      })

      // Write IV to file
      fs.writeFile(path.join(tmpDir, 'IV'), cipher.IV, err => {
        chkErr(err, cb)

        electron.event.sender.send('progressData', {progress: '0', title: 'Encrypting', desc: '(3/5) Zipping Files'})

        // Init the progress magic
        const str = progress({
          length: totalFolderSize,
          time: 100,
        })

        // Now we send the progress status back to our renderer via the progressData function
        str.on('progress', function(progress) {
          if (progress.percentage >= 99)
            progress.percentage = 99

          electron.event.sender.send('progressData', {
            progress: progress.percentage,
            title: 'Encrypting', desc: '(3/5) Zipping Files, ETA: ' + progress.eta + ' seconds',
          })
        })

        // Begin streaming tar to output
        const streamer = archive.pipe(str).pipe(output)

        streamer.on('error', function(err) {
          chkErr(err, cb)
        })

        streamer.on('finish', function() {
          electron.event.sender.send('progressData', {progress: '0', title: 'Encrypting', desc: '(4/5) Encrypting Zip'})

          // Encrypt on finished tarring
          const input = fs.createReadStream(path.join(tmpDir, 'tar'))
          const encryptedoutput = fs.createWriteStream('./encryptedfolder/encrypted')

          // Do a file stat to check the file size of the encrypted file
          const stat = fs.statSync(path.join(tmpDir, 'tar'))
          const str = progress({
            length: stat.size,
            time: 100,
          })

          // Now we send the progress status back to our renderer via the progressData function
          str.on('progress', function(progress) {
            electron.event.sender.send('progressData', {
              progress: progress.percentage,
              title: 'Encrypting', desc: '(4/5) Encrypting Zip, ETA: ' + progress.eta + ' seconds',
            })
          })

          const encryptedstream = input.pipe(cipher.encrypt).pipe(str).pipe(encryptedoutput)

          encryptedstream.on('error', function(err) {
            chkErr(err, cb)
          })

          encryptedstream.on('finish', () => {
            electron.event.sender.send('progressData', {progress: '100', title: 'Encrypting', desc: '(5/5) Cleaning Up'})
            // Cleanup after encrypt
            for (let i in files) {
              if (files[i] !== './encryptedfolder') {
                rimraf(files[i], function(err) {
                  chkErr(err, cb)
                })
              }
            }

            fs.unlink(path.join(tmpDir, 'tar'))
            cb()
          })
        })
      })
    })
  })
}

// How we decrypt folders
exports.decryptFolder = cb => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir)
  }

  fs.access(path.join(tmpDir, 'IV'), fs.F_OK, function(err) {
    if (err) {
      cb('error, already decrypted')
      return
    }

    electron.event.sender.send('progressData', {progress: '0', title: 'Decrypting', desc: '(1/4) Decrypting Zip'})

    // Create the cipher from the stored IV
    let cipher = exports.generateCiphers(fs.readFileSync(path.join(tmpDir, 'IV')))

    // Create the read stream
    const input = fs.createReadStream('./encryptedfolder/encrypted')

    // First step is to just decrypt the whole zip
    const output = fs.createWriteStream(path.join(tmpDir, 'decrypted'))

    // Do a file stat to check the file size of the encrypted file
    const stat = fs.statSync('./encryptedfolder/encrypted')
    const str = progress({
      length: stat.size,
      time: 100,
    })

    // Now we send the progress status back to our renderer via the progressData function
    str.on('progress', function(progress) {
      if (progress.percentage >= 99)
        progress.percentage = 99

      electron.event.sender.send('progressData', {
        progress: progress.percentage,
        title: 'Decrypting', desc: '(2/4) Decrypting Zip, ETA: ' + progress.eta + ' seconds',
      })
    })

    const stream = input.pipe(cipher.decrypt).pipe(str).pipe(output)

    stream.on('error', function(err) {
      chkErr(err, cb)
    })

    stream.on('finish', () => {
      electron.event.sender.send('progressData', {progress: '0', title: 'Decrypting', desc: '(3/4) Extracting Files'})

      // Init the progress magic
      const stat = fs.statSync(path.join(tmpDir, 'decrypted'))
      const str = progress({
        length: stat.size,
        time: 100,
      })

      // Now we send the progress status back to our renderer via the progressData function
      str.on('progress', function(progress) {
        if (progress.percentage >= 99)
          progress.percentage = 99

        electron.event.sender.send('progressData', {
          progress: progress.percentage,
          title: 'Decrypting', desc: '(3/4) Extracting Files, ETA: ' + progress.eta + ' seconds',
        })
      })

      // Then untar
      const readstreamer = fs.createReadStream(path.join(tmpDir, 'decrypted')).pipe(str).pipe(tar.extract('./encryptedfolder'))

      readstreamer.on('finish', () => {
        electron.event.sender.send('progressData', {progress: '100', title: 'Decrypting', desc: '(4/4) Cleaning Up'})
        // And cleanup
        fs.unlink(path.join(tmpDir, 'decrypted'))
        fs.unlink(path.join(tmpDir, 'IV'))
        fs.unlink('./encryptedfolder/encrypted')
        cb()
      })
    })

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
  for (let i = 0; i <= (thisHmac.length - 1); i++) {
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
  let cipherText = cipher.encrypt.update(string, electron.crypt.decryptMethod, electron.crypt.encryptMethod)
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
