'use strict'

const connection = new(require('nosqlite').Connection)('./db')

exports.init = electron => {
  electron.dev = false

  electron.event

  electron.crypt = {
    bits: 0,
    decryptMethod: 'utf-8',
    encryptMethod: 'hex',
    salt: {
      randomBytes: 32,
    },
    pbkd2f: {
      iterations: 0,
      bytes:      0,
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
