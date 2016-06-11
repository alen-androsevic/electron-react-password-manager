'use strict'

const connection = new(require('nosqlite').Connection)('./db')

exports.init = electron => {
  electron.dev = false

  electron.crypt = {
    bits: 256,
    salt: {
      randomBytes: 2048,
    },
    pbkd2f: {
      iterations: 300000,
      count:      128,
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
