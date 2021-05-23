'use strict'
const she = require('../src/')
const assert = require('assert')
const { performance } = require('perf_hooks')

const begin = performance.now()
she.init(she.BN254)
  .then(() => {
    const end = performance.now()
    const roundTime = (Math.round((end - begin) * 1000)) / 1000
    console.log(`time=${roundTime}`)
    const sec = new she.SecretKey()
    sec.setByCSPRNG()
    sec.dump()
    const pub = sec.getPublicKey()
    pub.dump()
    const c = pub.encG1(123)
    const d = sec.dec(c)
    console.log(`d=${d}`)
  })

