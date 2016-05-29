'use strict'

const connection = new(require('nosqlite').Connection)('./inc/db')

exports.init = electron => {
  electron.dev = true

  electron.crypt = {
    bits: 2048,
    supersalt: {
      saltLen: 2048,
      maxpos: 190,
    },
    pbkd2f: {
      iterations: 300000,
      count: 420,
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
