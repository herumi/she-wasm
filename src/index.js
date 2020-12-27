const crypto = require('crypto')
const createModule = require('./she_c.js')
const setupFactory = require('./she')

const getRandomValues = crypto.randomFillSync
const she = setupFactory(createModule, getRandomValues)

module.exports = she
