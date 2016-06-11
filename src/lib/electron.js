'use strict'

const connection = new(require('nosqlite').Connection)('./db')

exports.init = electron => {
  electron.dev = false

  electron.crypt = {
    bits: 256,
    decryptMethod: 'utf-8',
    encryptMethod: 'hex',
    salt: {
      randomBytes: 128,
    },
    pbkd2f: {
      iterations: 600000,
      bytes:      128,
    },
  }
  electron.db = {
    passwords:  connection.database('passwords'),
    salt:       connection.database('salt'),
    encryption: connection.database('encryption'),
  }

  electron.log = log => {
    console.log(log)
  }
}
