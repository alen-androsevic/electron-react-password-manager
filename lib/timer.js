'use strict'

const moment = require('moment')

function timer() {
  this.startTime = moment()
}

timer.prototype.stop = function() {
  var duration = moment.duration(moment().diff(this.startTime))
  return duration.asMilliseconds()
}

module.exports = timer
