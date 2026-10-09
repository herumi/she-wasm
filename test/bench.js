'use strict'
// usage: node test/bench.js [curveName] [count]
// e.g. node test/bench.js BLS12_381 30
const she = require('../src/index.js')
const { performance } = require('perf_hooks')

const curveName = process.argv[2] || 'BLS12_381'
const N = parseInt(process.argv[3] || '30', 10)
if (she[curveName] === undefined) {
  console.error(`unknown curve ${curveName}`)
  process.exit(1)
}

function bench (label, count, func) {
  for (let i = 0; i < 3; i++) func() // warm up
  const start = performance.now()
  for (let i = 0; i < count; i++) func()
  const t = (performance.now() - start) / count
  console.log(`${label.padEnd(24)} ${t.toFixed(3)} msec`)
}

async function main () {
  await she.init(she[curveName])
  console.log(`curve=${curveName} count=${N} g1only=${she.g1only}`)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  const m = 5
  const c1 = pub.encG1(m)
  const [cb1, zb1] = pub.encWithZkpBinG1(1)
  const [cs, zs] = pub.encWithZkpSetG1(3, [1, 2, 3, 4])
  const [cd, zd] = sec.decWithZkpDec(cb1, pub)

  bench('encG1', N, () => pub.encG1(m))
  bench('decG1', N, () => sec.dec(c1))
  bench('ppk.encG1', N, () => ppub.encG1(m))
  bench('encWithZkpBinG1', N, () => pub.encWithZkpBinG1(1))
  bench('verifyZkpBinG1', N, () => pub.verify(cb1, zb1))
  bench('ppk.encWithZkpBinG1', N, () => ppub.encWithZkpBinG1(1))
  bench('ppk.verifyZkpBinG1', N, () => ppub.verify(cb1, zb1))
  bench('encWithZkpSetG1(4)', N, () => pub.encWithZkpSetG1(3, [1, 2, 3, 4]))
  bench('verifyZkpSetG1(4)', N, () => pub.verifyZkpSet(cs, zs, [1, 2, 3, 4]))
  bench('decWithZkpDec', N, () => sec.decWithZkpDec(cb1, pub))
  bench('verifyZkpDec', N, () => pub.verifyZkpDec(cb1, zd, cd))

  if (she.g1only) {
    ppub.destroy()
    return
  }
  const c2 = pub.encG2(m)
  const ct = pub.encGT(m)
  const [cb2, zb2] = pub.encWithZkpBinG2(1)
  const [cbe1, cbe2, zbe] = pub.encWithZkpBinEq(1)
  const [ce1, ce2, ze] = pub.encWithZkpEq(m)

  bench('encG2', N, () => pub.encG2(m))
  bench('decG2', N, () => sec.dec(c2))
  bench('encGT', N, () => pub.encGT(m))
  bench('decGT', N, () => sec.dec(ct))
  bench('mul', N, () => she.mul(c1, c2))
  bench('encWithZkpBinG2', N, () => pub.encWithZkpBinG2(1))
  bench('verifyZkpBinG2', N, () => pub.verify(cb2, zb2))
  bench('encWithZkpBinEq', N, () => pub.encWithZkpBinEq(1))
  bench('verifyZkpBinEq', N, () => pub.verifyZkpBinEq(cbe1, cbe2, zbe))
  bench('encWithZkpEq', N, () => pub.encWithZkpEq(m))
  bench('verifyZkpEq', N, () => pub.verifyZkpEq(ce1, ce2, ze))
  ppub.destroy()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
