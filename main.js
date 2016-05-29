'use strict'

const electron     = require('electron')
const publicFolder = require('./lib/public.js')

const settings = require('./lib/electron.js').init(electron, (err, data) => {
  if (err)
    throw new Error(err)
})

const events = require('./lib/events').init(electron, (err, data) => {
  if (err)
    throw new Error(err)
})

const socket = require('./lib/socket').init(electron, (err, data) => {
  if (err)
    throw new Error(err)
})
