'use strict'

const chkErr       = require('./error').chkErr
const finalhandler = require('finalhandler')
const http         = require('http')
const serveStatic  = require('serve-static')

const serve = serveStatic('inc')
const server = http.createServer((req, res) => {
  const done = finalhandler(req, res)
  serve(req, res, done)
})

server.listen(9420)
