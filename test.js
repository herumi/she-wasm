"use strict"
const she = require('./she.js')
const assert = require('assert')

she.init()
  .then(() => {
    minimumTest()
    encDecTest()
    serializeTest()
    rerandTest()
    convertTest()
  })

function minimumTest() {
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

function encDecTest() {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  for (let m = -3; m < 3; m++) {
    const c1 = pub.encG1(m)
    assert.equal(sec.dec(c1), m)
    assert.equal(sec.isZero(c1), m == 0)
    const c2 = pub.encG2(m)
    assert.equal(sec.dec(c2), m)
    assert.equal(sec.isZero(c2), m == 0)
    const ct = pub.encGT(m)
    assert.equal(sec.dec(ct), m)
    assert.equal(sec.isZero(ct), m == 0)
  }
}

function serializeSubTest(t, cstr) {
  const s = t.toHexStr()
  const t2 = new cstr()
  t2.fromHexStr(s)
  assert.deepEqual(t.serialize(), t2.serialize())
}

function serializeTest() {
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

function rerandSubTest(c, sec, pub, m) {
  const s1 = c.toHexStr()
  pub.reRand(c)
  const s2 = c.toHexStr()
  assert(s1 != s2)
  assert.equal(sec.dec(c), m)
}

function rerandTest() {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()

  const m = 987
  rerandSubTest(pub.encG1(m), sec, pub, m)
  rerandSubTest(pub.encG2(m), sec, pub, m)
  rerandSubTest(pub.encGT(m), sec, pub, m)
}

function convertTest() {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m = 987
  assert.equal(sec.dec(pub.convert(pub.encG1(m))), m)
  assert.equal(sec.dec(pub.convert(pub.encG2(m))), m)
}
