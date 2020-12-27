const createModule = require('../../src/she_c.js')
const setupFactory = require('../../src/she.js')
const crypto = window.crypto || window.msCrypto

const getRandomValues = x => crypto.getRandomValues(x)
const she = setupFactory(createModule, getRandomValues)

module.exports = she

