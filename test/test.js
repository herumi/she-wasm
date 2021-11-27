'use strict'
const she = require('../src/index.js')
const assert = require('assert')
const { performance } = require('perf_hooks')

const curveTest = (curveType, name) => {
  she.init(curveType)
    .then(() => {
      try {
        const g1only = she.g1only
        console.log(`name=${name} g1only=${g1only}`)
        verifyCipherTextBinTest(g1only)
        partialRecordTest()
        controlledRandomValues(g1only)
        minimumTestG1()
        randHistoryAddTest()
        zkpSetTest()
        zkpDecTest()
        encDecTest(g1only)
        serializeTest(g1only)
        rerandTest(g1only)
        ppubTest(g1only)
        zkpBinTest(g1only)
        mulIntTest(g1only)
        if (!g1only) {
          minimumTest()
          zkpDecGTTest()
          convertTest()
          finalExpTest()
          loadTableTest()
          zkpEqTest()
        }
        benchmark(g1only)
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
  await curveTest(she.SECP256K1, 'SECP256K1')
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

function minimumTestG1 () {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m1 = 9
  const m2 = 5
  const c1 = pub.encG1(m1)
  assert.equal(sec.dec(c1), m1)
  const c2 = pub.encG1(m2)
  assert.equal(sec.dec(c2), m2)
  const c12 = she.add(c1, c2)
  assert.equal(sec.dec(c12), m1 + m2)
}

function randHistoryAddTest () {
  console.log('randHistoryAddTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  for (let i = 0; i < 10; i++) {
    const r1 = new she.RandHistory()
    const r2 = new she.RandHistory()
    const m1 = 12 + i
    const m2 = 34 + i
    const c1 = pub.encG1(m1, r1)
    const c2 = pub.encG1(m2, r2)
    const c12 = she.add(c1, c2)
    const r12 = she.RandHistory.add(r1, r2)
    const d = pub.encG1(m1 + m2, r12)
    assert.equal(sec.dec(d), m1 + m2)
    // d is recovered from r12
    assert.equal(c12.serializeToHexStr(), d.serializeToHexStr())
  }
}

function controlledRandomValues (g1only) {
  console.log(`controlledRandomValues g1only=${g1only}`)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  let methods = ['encG1', 'encWithZkpBinG1']
  if (!g1only) methods = methods.concat(['encG1', 'encWithZkpBinG1', 'encG2', 'encGT', 'encWithZkpEq', 'encWithZkpBinEq', 'encWithZkpBinG2'])
  methods.forEach(method => {
    const rh = new she.RandHistory() // empty
    const r0 = pub[method](1)
    const r = pub[method](1, rh) // record
    const r2 = pub[method](1, rh) // replay
    const r3 = pub[method](1, she.strToRandHistory(rh.getStr()))
    const r4 = pub[method](1)
    if (method.indexOf('Zkp') === -1) {
      assert.equal(r.serializeToHexStr(), r2.serializeToHexStr())
      assert.equal(r.serializeToHexStr(), r3.serializeToHexStr())
      assert.notEqual(r.serializeToHexStr(), r4.serializeToHexStr())
      assert.notEqual(r0.serializeToHexStr(), r4.serializeToHexStr())
    } else {
      r.forEach((v, i) => {
        assert.equal(r[i].serializeToHexStr(), r2[i].serializeToHexStr())
        assert.equal(r[i].serializeToHexStr(), r3[i].serializeToHexStr())
        assert.notEqual(r[i].serializeToHexStr(), r4[i].serializeToHexStr())
      })
    }
  })
  {
    const ppub = new she.PrecomputedPublicKey()
    ppub.init(pub)
    const rh = new she.RandHistory()
    const m = 5
    const mVec = [1, 2, 5, 7]
    const [c1, zkp1] = ppub.encWithZkpSetG1(m, mVec, rh)
    assert.equal(sec.dec(c1), m)
    assert(ppub.verifyZkpSet(c1, zkp1, mVec))
    const [c2, zkp2] = ppub.encWithZkpSetG1(m, mVec, rh)
    assert.equal(sec.dec(c2), m)
    assert(ppub.verifyZkpSet(c2, zkp2, mVec))
    assert.deepEqual(c1.serialize(), c2.serialize())
    assert.deepEqual(zkp1.serialize(), zkp2.serialize())
    ppub.destroy()
  }
}

function verifyCipherTextBinTest (g1only) {
  console.log(`verifyCipherTextBinTest g1only=${g1only}`)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  /*
    check that r is not generated from rh
  */
  const checkCipher = (r, rh) => {
    try {
      pub.verifyCipherTextBin(r, rh)
      throw new Error('not here')
    } catch (e) {
      assert(String(e).indexOf('verifyCipherTextBin') >= 0)
    }
  }
  let methods = ['encG1', 'encWithZkpBinG1']
  if (!g1only) methods = methods.concat(['encG2', 'encWithZkpBinG2', 'encGT'])
  methods.forEach(method => {
    const rh0 = new she.RandHistory() // empty
    const r0 = pub[method](0, rh0)
    const rh1 = new she.RandHistory() // empty
    const r1 = pub[method](1, rh1)
    if (method.indexOf('Zkp') === -1) {
      assert.equal(pub.verifyCipherTextBin(r0, rh0), 0)
      assert.equal(pub.verifyCipherTextBin(r1, rh1), 1)
      checkCipher(r0, rh1)
      checkCipher(r1, rh0)
    } else {
      r0.forEach((v, i) => {
        // Do not test zkp
        // assert.equal(pub.verifyCipherTextBin(r0[i], rh0), 0)
        // assert.equal(pub.verifyCipherTextBin(r1[i], rh1), 1)
        checkCipher(r0[i], rh1)
        checkCipher(r1[i], rh0)
      })
    }
  })
}

function encDecTest (g1only) {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  for (let m = -3; m < 3; m++) {
    const c1 = pub.encG1(m)
    assert.equal(sec.dec(c1), m)
    if (!g1only) assert.equal(sec.decViaGT(c1), m)
    assert.equal(sec.isZero(c1), m === 0)
    const n1 = she.neg(c1)
    assert.equal(sec.dec(n1), -m)
    if (g1only) continue
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

function serializeTest (g1only) {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  serializeSubTest(sec, she.SecretKey)
  serializeSubTest(pub, she.PublicKey)
  const m = 123
  const c1 = pub.encG1(m)
  serializeSubTest(c1, she.CipherTextG1)
  if (g1only) return
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

function rerandTest (g1only) {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()

  const m = 987
  rerandSubTest(pub.encG1(m), sec, pub, m)
  if (g1only) return
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

function ppubTest (g1only) {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  const m = 1234
  const c1 = ppub.encG1(m)
  assert.equal(sec.dec(c1), m)
  bench('PPKencG1', 100, () => ppub.encG1(m))

  if (!g1only) {
    const c2 = ppub.encG2(m)
    assert.equal(sec.dec(c2), m)
    bench('PPKencG2', 100, () => ppub.encG2(m))
    const ct = ppub.encGT(m)
    assert.equal(sec.dec(ct), m)
    bench('PPKencGT', 100, () => ppub.encGT(m))
  }
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

function zkpBinTest (g1only) {
  console.log(`zkpBinTest g1only=${g1only}`)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  zkpBinTestSub(sec, pub, 'encWithZkpBinG1')
  if (!g1only) {
    zkpBinTestSub(sec, pub, 'encWithZkpBinG2')
    zkpBinEqTestSub(sec, pub, 'encWithZkpBinEq')
  }

  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  zkpBinTestSub(sec, ppub, 'encWithZkpBinG1')
  if (!g1only) {
    zkpBinTestSub(sec, ppub, 'encWithZkpBinG2')
    // ZKP bin eq not supported on pre computed
  }
  ppub.destroy()
}

function zkpSetTestSub (sec, pub, encWithZkpSet) {
  console.log(`zkpSetTestSub ${encWithZkpSet}`)
  const mVec = [-3, 0, 1, 4, 5]
  for (let mSize = 1; mSize <= mVec.length; mSize++) {
    for (let i = 0; i < mSize; i++) {
      const m = mVec[0]
      const [c, zkp] = pub[encWithZkpSet](m, mVec)
      assert.equal(sec.dec(c), m)
      assert(pub.verifyZkpSet(c, zkp, mVec))
      serializeSubTest(zkp, she.ZkpSet)
      zkp.a_[0]++
      assert(!pub.verifyZkpSet(c, zkp, mVec))
    }
  }
  try {
    pub[encWithZkpSet](999, mVec)
    assert(false)
  } catch (e) {
    assert(true)
  }
}

function zkpSetTest () {
  console.log('zkpSetTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  zkpSetTestSub(sec, ppub, 'encWithZkpSetG1')
  ppub.destroy()
}

function partialRecordTest () {
  console.log('partialRecordTest')
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  const rh1 = new she.RandHistory()
  const rh2 = new she.RandHistory()
  const m1 = 1
  const m2 = 0
  const c1 = ppub.encG1(m1, rh1)
  const c2 = ppub.encG1(m2, rh2)
  {
    const rh1top = rh1.copy(1)
    const rh2top = rh2.copy(1)
    const rhsum = she.RandHistory.add(rh1top, rh2top)
    const [c11, zkp1] = ppub.encWithZkpBinG1(m1, rh1top)
    const [c21, zkp2] = ppub.encWithZkpBinG1(m2, rh2top)
    assert(pub.verify(c11, zkp1))
    assert(pub.verify(c21, zkp2))
    const csum = she.add(c11, c21)
    assert.equal(sec.dec(csum), m1 + m2)
    // recover csum2 by rhsum
    const csum2 = ppub.encG1(m1 + m2, rhsum)
    assert.equal(csum.serializeToHexStr(), csum2.serializeToHexStr())

    assert.equal(pub.verifyCipherTextBin(c11, rh1top), m1)
    assert.equal(pub.verifyCipherTextBin(c21, rh2top), m2)
    assert.equal(c1.serializeToHexStr(), c11.serializeToHexStr())
    assert.equal(c2.serializeToHexStr(), c21.serializeToHexStr())
  }

  {
    const rh1top = rh1.copy(1)
    const rh2top = rh2.copy(1)
    const rhsum = she.RandHistory.add(rh1top, rh2top)
    const [c11, zkp1] = ppub.encWithZkpSetG1(m1, [0, 1], rh1top)
    const [c21, zkp2] = ppub.encWithZkpSetG1(m2, [0, 1], rh2top)
    const csum = she.add(c11, c21)
    assert.equal(sec.dec(csum), m1 + m2)
    assert.equal(sec.dec(c11), m1)
    assert.equal(sec.dec(c21), m2)
    assert(ppub.verifyZkpSet(c11, zkp1, [0, 1]))
    assert(ppub.verifyZkpSet(c21, zkp2, [0, 1]))
    assert.equal(c1.serializeToHexStr(), c11.serializeToHexStr())
    assert.equal(c2.serializeToHexStr(), c21.serializeToHexStr())
    const [c, zkp] = ppub.encWithZkpSetG1(m1 + m2, [0, 1, 2], rhsum)
    assert.equal(c.serializeToHexStr(), csum.serializeToHexStr())
    assert(ppub.verifyZkpSet(c, zkp, [0, 1, 2]))
  }
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

function mulIntTest (g1only) {
  console.log(`mulIntTest g1only=${g1only}`)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m1 = 13
  const m2 = 24
  const c1 = she.mulInt(pub.encG1(m1), m2)
  assert.equal(sec.dec(c1), m1 * m2)
  if (g1only) return
  const c2 = she.mulInt(pub.encG2(m1), m2)
  assert.equal(sec.dec(c2), m1 * m2)
  const ct = she.mulInt(pub.encGT(m1), m2)
  assert.equal(sec.dec(ct), m1 * m2)
}

function benchmark (g1only) {
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const m = 1234
  const C = 100
  const c1 = pub.encG1(m)
  bench('encG1', C, () => pub.encG1(m))
  bench('decG1', C, () => sec.dec(c1))
  bench('addG1', C, () => she.add(c1, c1))

  if (g1only) return
  const c2 = pub.encG2(m)
  bench('encG2', C, () => pub.encG2(m))
  bench('decG2', C, () => sec.dec(c2))
  bench('addG2', C, () => she.add(c2, c2))

  const ct = pub.encGT(m)
  bench('encGT', C, () => pub.encGT(m))
  bench('decGT', C, () => sec.dec(ct))
  bench('addGT', C, () => she.add(ct, ct))

  bench('mul', C, () => she.mul(c1, c2))
  bench('mulML', C, () => she.mulML(c1, c2))
  bench('finalExp', C, () => she.finalExpGT(ct))
}
