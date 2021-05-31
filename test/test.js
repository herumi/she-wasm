'use strict'
const she = require('../src/index.js')
const assert = require('assert')
const { performance } = require('perf_hooks')

const curveTest = (curveType, name) => {
  she.init(curveType)
    .then(() => {
      try {
        console.log(`name=${name}`)
        controlledRandomValues()
         minimumTest()
        zkpDecTest()
        zkpDecGTTest()
        encDecTest()
        serializeTest()
        rerandTest()
        convertTest()
        ppubTest()
        finalExpTest()
        loadTableTest()
        zkpBinTest()
        zkpEqTest()
        mulIntTest()
        benchmark()
      } catch (e) {
        console.error('TEST FAIL')
        console.error(e)
        assert(false)
      }
    })
}

async function curveTestAll () {
  // can't parallel
  await curveTest(she.BN254, 'BN254')
  await curveTest(she.BN_SNARK1, 'BN_SNARK1')
  await curveTest(she.BLS12_381, 'BLS12_381')
}

curveTestAll()

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

function controlledRandomValues () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const rnd = she.getCompliantRandomValues()
  const methods = ['encG1','encG2', 'encGT','encWithZkpEq','encWithZkpBinEq','encWithZkpBinG2','encWithZkpBinG1']
  methods.forEach(method => {
    const r  = pub[method](1,rnd)
    const r2  = pub[method](1,rnd)
    const r3  = pub[method](1,she.deserializeRandomValues(she.serializeRandomValues(rnd)))
    const r4  = pub[method](1)
    if(method.indexOf('Zkp') === -1){
      assert.equal(r.serializeToHexStr(), r2.serializeToHexStr())
      assert.equal(r.serializeToHexStr(), r3.serializeToHexStr())
      assert.notEqual(r.serializeToHexStr(), r4.serializeToHexStr())
    }  else {
      r.forEach((v,i) => {
        assert.equal(r[i].serializeToHexStr(), r2[i].serializeToHexStr())
        assert.equal(r[i].serializeToHexStr(), r3[i].serializeToHexStr())
        assert.notEqual(r[i].serializeToHexStr(), r4[i].serializeToHexStr())
      })
    }
  })
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
    const n1 = she.neg(c1)
    assert.equal(sec.dec(n1), -m)
    const c2 = pub.encG2(m)
    assert.equal(sec.dec(c2), m)
    assert.equal(sec.decViaGT(c2), m)
    assert.equal(sec.isZero(c2), m === 0)
    const n2 = she.neg(c2)
    assert.equal(sec.dec(n2), -m)
    const ct = pub.encGT(m)
    assert.equal(sec.dec(ct), m)
    assert.equal(sec.isZero(ct), m === 0)
    const nt = she.neg(ct)
    assert.equal(sec.dec(nt), -m)
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
  const start = performance.now()
  for (let i = 0; i < count; i++) {
    func()
  }
  const end = performance.now()
  const t = (end - start) / count
  const roundTime = (Math.round(t * 1000)) / 1000
  console.log(label + ' ' + roundTime)
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
    if (she.curveType !== she.BN254) return
    she.loadTableForGTDLP(fs.readFileSync(DLPtable))
    console.log(`use ${DLPtable} for DLP`)
  } catch (e) {
    console.log(`${e} is not found`)
    console.log(`curl -O https://herumi.github.io/she-dlp-table/${DLPtable}`)
    return
  }
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
}

function zkpBinTestSub (sec, pub, encWithZkpBin) {
  console.log(`zkpBinTestSub ${encWithZkpBin}`)
  for (let m = 0; m < 2; m++) {
    const [c, zkp] = pub[encWithZkpBin](m)
    assert.equal(sec.dec(c), m)
    assert(pub.verify(c, zkp))
    serializeSubTest(zkp, she.ZkpBin)
    zkp.a_[0]++
    assert(!pub.verify(c, zkp))
  }
  try {
    pub[encWithZkpBin](2)
    assert(false)
  } catch (e) {
    assert(true)
  }
}

function zkpBinEqTestSub (sec, pub, encWithZkpBinEq) {
  console.log(`zkpBinEqTestSub ${encWithZkpBinEq}`)
  for (let m = 0; m < 2; m++) {
    const [c1, c2, zkp] = pub[encWithZkpBinEq](m)
    assert.equal(sec.dec(c1), m)
    assert.equal(sec.dec(c2), m)
    assert(pub.verifyZkpBinEq(c1, c2, zkp))
    const [c3, c4] = pub[encWithZkpBinEq](m)
    assert(!pub.verifyZkpBinEq(c3, c4, zkp))
    zkp.a_[0]++
    assert(!pub.verifyZkpBinEq(c1, c2, zkp))
  }
  try {
    pub[encWithZkpBinEq](2)
    assert(false)
  } catch (e) {
    assert(true)
  }
}

function zkpBinTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  zkpBinTestSub(sec, pub, 'encWithZkpBinG1')
  zkpBinTestSub(sec, pub, 'encWithZkpBinG2')
  zkpBinEqTestSub(sec, pub, 'encWithZkpBinEq')

  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  zkpBinTestSub(sec, ppub, 'encWithZkpBinG1')
  zkpBinTestSub(sec, ppub, 'encWithZkpBinG2')
  // ZKP bin eq not supported on pre computed
  ppub.destroy()
}

function zkpEqTest () {
  console.log('zkpEqTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  for (let m = -3; m < 5; m++) {
    const [c1, c2, zkp] = pub.encWithZkpEq(m)
    assert.equal(sec.dec(c1), m)
    assert.equal(sec.dec(c2), m)
    assert(pub.verifyZkpEq(c1, c2, zkp))
    serializeSubTest(zkp, she.ZkpEq)
    zkp.a_[0]++
    assert(!pub.verify(c1, c2, zkp))
  }
}

function zkpDecTest () {
  console.log('zkpDecTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m = 123
  const c = pub.encG1(m)
  const [dec, zkp] = sec.decWithZkpDec(c, pub)
  assert.equal(dec, m)
  assert(pub.verify(c, zkp, m))
  assert(!pub.verify(c, zkp, m + 1))

  const c1 = pub.encG1(m)
  assert(!pub.verify(c1, zkp, m))
  zkp.a_[0]++
  assert(!pub.verify(c, zkp, m))
}

function zkpDecGTTest () {
  console.log('zkpDecGTTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const aux = pub.getAuxiliaryForZkpDecGT()
  const m = 123
  const c = pub.encGT(m)
  const [dec, zkp] = sec.decWithZkpDecGT(c, aux)
  assert.equal(dec, m)
  assert(aux.verify(c, zkp, m))
  assert(!aux.verify(c, zkp, m + 1))

  const c1 = pub.encGT(m)
  assert(!aux.verify(c1, zkp, m))
  zkp.a_[0]++
  assert(!aux.verify(c, zkp, m))
}

function mulIntTest () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m1 = 13
  const m2 = 24
  const c1 = she.mulInt(pub.encG1(m1), m2)
  const c2 = she.mulInt(pub.encG2(m1), m2)
  const ct = she.mulInt(pub.encGT(m1), m2)
  assert.equal(sec.dec(c1), m1 * m2)
  assert.equal(sec.dec(c2), m1 * m2)
  assert.equal(sec.dec(ct), m1 * m2)
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
