'use strict'
const she = require('./she.js')
const assert = require('assert')

she.init()
  .then(() => {
    minimumTest()
    encDecTest()
    serializeTest()
    rerandTest()
    convertTest()
    ppubTest()
    finalExpTest()
    loadTableTest()
    benchmark()
  })

function minimumTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m1 = 9
  const m2 = 5
  const m3 = 2
  const m4 = -1
  const c11 = pub.encG1(m1)
  assert.equal(sec.dec(c11), m1)
  const c12 = pub.encG1(m2)
  const c21 = pub.encG2(m3)
  assert.equal(sec.dec(c21), m3)
  const c22 = pub.encG2(m4)
  const c1 = she.add(c11, c12)
  const c2 = she.add(c21, c22)
  const ct = she.mul(c1, c2)
  assert.equal(sec.dec(ct), (m1 + m2) * (m3 + m4))
}

function encDecTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  for (let m = -3; m < 3; m++) {
    const c1 = pub.encG1(m)
    assert.equal(sec.dec(c1), m)
    assert.equal(sec.decViaGT(c1), m)
    assert.equal(sec.isZero(c1), m === 0)
    const c2 = pub.encG2(m)
    assert.equal(sec.dec(c2), m)
    assert.equal(sec.decViaGT(c2), m)
    assert.equal(sec.isZero(c2), m === 0)
    const ct = pub.encGT(m)
    assert.equal(sec.dec(ct), m)
    assert.equal(sec.isZero(ct), m === 0)
  }
}

function serializeSubTest (t, Cstr) {
  const s = t.serializeToHexStr()
  const t2 = new Cstr()
  t2.deserializeHexStr(s)
  assert.deepEqual(t.serialize(), t2.serialize())
}

function serializeTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  serializeSubTest(sec, she.SecretKey)
  serializeSubTest(pub, she.PublicKey)
  const m = 123
  const c1 = pub.encG1(m)
  serializeSubTest(c1, she.CipherTextG1)
  const c2 = pub.encG2(m)
  serializeSubTest(c2, she.CipherTextG2)
  const ct = pub.encGT(m)
  serializeSubTest(ct, she.CipherTextGT)
}

function rerandSubTest (c, sec, pub, m) {
  const s1 = c.serializeToHexStr()
  pub.reRand(c)
  const s2 = c.serializeToHexStr()
  assert(s1 !== s2)
  assert.equal(sec.dec(c), m)
}

function rerandTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()

  const m = 987
  rerandSubTest(pub.encG1(m), sec, pub, m)
  rerandSubTest(pub.encG2(m), sec, pub, m)
  rerandSubTest(pub.encGT(m), sec, pub, m)
}

function convertTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m = 987
  assert.equal(sec.dec(pub.convert(pub.encG1(m))), m)
  assert.equal(sec.dec(pub.convert(pub.encG2(m))), m)
}

function bench (label, count, func) {
  const start = Date.now()
  for (let i = 0; i < count; i++) {
    func()
  }
  const end = Date.now()
  const t = (end - start) / count
  console.log(label + ' ' + t)
}

function ppubTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  const m = 1234
  const c1 = ppub.encG1(m)
  assert.equal(sec.dec(c1), m)
  const c2 = ppub.encG2(m)
  assert.equal(sec.dec(c2), m)
  const ct = ppub.encGT(m)
  assert.equal(sec.dec(ct), m)

  bench('PPKencG1', 100, () => ppub.encG1(m))
  bench('PPKencG2', 100, () => ppub.encG2(m))
  bench('PPKencGT', 100, () => ppub.encGT(m))

  ppub.destroy()
}

function finalExpTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m11 = 5
  const m12 = 7
  const m21 = -3
  const m22 = 9
  const c11 = pub.encG1(m11)
  const c12 = pub.encG1(m12)
  const c21 = pub.encG2(m21)
  const c22 = pub.encG2(m22)

  let ct = she.mul(c11, c21)
  assert.equal(sec.dec(ct), m11 * m21)

  const ct1 = she.mulML(c11, c21)
  ct = she.finalExpGT(ct1)
  assert.equal(sec.dec(ct), m11 * m21)

  const ct2 = she.mulML(c12, c22)
  ct = she.add(ct1, ct2)
  ct = she.finalExpGT(ct)
  assert.equal(sec.dec(ct), (m11 * m21) + (m12 * m22))
}

function loadTableTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const fs = require('fs')
  console.log('load table')
  const DLPtable = 'she-dlp-0-20-gt.bin'
  try {
    she.loadTableForGTDLP(fs.readFileSync(DLPtable))
    console.log(`use ${DLPtable} for DLP`)
    {
      const m = 0x7fffffff
      console.log(`m=${m}`)
      const ct = pub.encGT(m)
      assert.equal(sec.dec(ct), m)
      bench('decGT', 10, () => sec.dec(ct))
    }
    {
      const m = -0x7fffffff - 1
      console.log(`m=${m}`)
      const ct = pub.encGT(m)
      assert.equal(sec.dec(ct), m)
    }
  } catch (e) {
    console.log(`${e} is not found`)
    console.log(`curl -O https://herumi.github.io/she-dlp-table/${DLPtable}`)
  }
}

function benchmark () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m = 1234
  const C = 100
  bench('encG1', C, () => pub.encG1(m))
  bench('encG2', C, () => pub.encG2(m))
  bench('encGT', C, () => pub.encGT(m))
  const c1 = pub.encG1(m)
  const c2 = pub.encG2(m)
  const ct = pub.encGT(m)
  bench('decG1', C, () => sec.dec(c1))
  bench('decG2', C, () => sec.dec(c2))
  bench('decGT', C, () => sec.dec(ct))
  bench('addG1', C, () => she.add(c1, c1))
  bench('addG2', C, () => she.add(c2, c2))
  bench('addGT', C, () => she.add(ct, ct))
  bench('mul', C, () => she.mul(c1, c2))
  bench('mulML', C, () => she.mulML(c1, c2))
  bench('finalExp', C, () => she.finalExpGT(ct))
}
