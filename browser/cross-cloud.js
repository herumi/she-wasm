// The computing server. It only ever sees ciphertexts: it has no secret key,
// so it can neither read a record nor read the aggregate it produces.
// This file must not touch the DOM.

let cloudRecords = []
let cloudExcerpts = []
let cloudResult = null

function cloudCount () {
  return cloudRecords.length
}

function cloudGetResult () {
  return cloudResult
}

function cloudGetExcerpt (i) {
  return cloudExcerpts[i]
}

function cloudClear () {
  cloudRecords = []
  cloudExcerpts = []
  cloudResult = null
}

function hexHead (buf, n) {
  let s = ''
  for (let i = 0; i < n && i < buf.length; i++) s += ('0' + buf[i].toString(16)).slice(-2)
  return s + '...'
}

// Receive packets from the users and deserialize them once. Everything is kept
// as live ciphertext objects afterwards; the DOM is never used as storage.
function cloudReceive (packets) {
  cloudClear()
  for (const p of packets) {
    const onehot = {}
    const excerpt = {}
    for (const key of CAT_KEYS) {
      onehot[key] = {
        g1: p.onehot[key].g1.map(deserG1),
        g2: p.onehot[key].g2.map(deserG2)
      }
      excerpt[key] = hexHead(p.onehot[key].g1[0], 6)
    }
    excerpt.health = hexHead(p.health.g1, 6)
    cloudRecords.push({
      onehot,
      health: { g1: deserG1(p.health.g1), g2: deserG2(p.health.g2) }
    })
    cloudExcerpts.push(excerpt)
  }
  return cloudRecords.length
}

// Cross tabulation of attribute keyA (p levels) by attribute keyB (q levels).
//
// Only the (p-1) x (q-1) sub-block is computed; the last row and column are
// recovered by the analyst from the marginals by subtraction (cross-demo-plan.md 5.2).
//
// The inner product is accumulated as Miller loop results and passed through
// finalExpGT once per cell, which is about 42% cheaper than calling she.mul
// per user (cross-demo-plan.md 4.3).
function cloudCrossTab (keyA, keyB, onProgress) {
  const n = cloudRecords.length
  if (n === 0) return Promise.reject(new Error('no data'))
  const p = levelNum(keyA)
  const q = levelNum(keyB)
  const acc = []
  for (let i = 0; i < p - 1; i++) acc.push(new Array(q - 1).fill(null))
  const rowSum = new Array(p).fill(null)
  const colSum = new Array(q).fill(null)

  const step = (u) => {
    const r = cloudRecords[u]
    const a = r.onehot[keyA].g1
    const b = r.onehot[keyB].g2
    for (let i = 0; i < p - 1; i++) {
      for (let j = 0; j < q - 1; j++) {
        const t = she.mulML(a[i], b[j])
        acc[i][j] = acc[i][j] === null ? t : she.add(acc[i][j], t)
      }
    }
    for (let i = 0; i < p; i++) rowSum[i] = rowSum[i] === null ? a[i] : she.add(rowSum[i], a[i])
    for (let j = 0; j < q; j++) colSum[j] = colSum[j] === null ? b[j] : she.add(colSum[j], b[j])
  }

  const t0 = Date.now()
  return runChunked(n, step, onProgress).then(() => {
    cloudResult = {
      mode: 'cross',
      keyA,
      keyB,
      n,
      cell: acc.map((row) => row.map((c) => she.finalExpGT(c))),
      rowSum,
      colSum,
      ms: Date.now() - t0
    }
    return cloudResult
  })
}

// Average of the health score per level of attribute keyA.
// The numerator and the denominator are returned separately because division
// is not a homomorphic operation; the analyst divides after decrypting.
function cloudMean (keyA, onProgress) {
  const n = cloudRecords.length
  if (n === 0) return Promise.reject(new Error('no data'))
  const p = levelNum(keyA)
  const acc = new Array(p).fill(null)
  const cnt = new Array(p).fill(null)
  let sumAll = null

  const step = (u) => {
    const r = cloudRecords[u]
    const a = r.onehot[keyA].g1
    for (let i = 0; i < p; i++) {
      const t = she.mulML(a[i], r.health.g2)
      acc[i] = acc[i] === null ? t : she.add(acc[i], t)
      cnt[i] = cnt[i] === null ? a[i] : she.add(cnt[i], a[i])
    }
    sumAll = sumAll === null ? r.health.g1 : she.add(sumAll, r.health.g1)
  }

  const t0 = Date.now()
  return runChunked(n, step, onProgress).then(() => {
    cloudResult = {
      mode: 'mean',
      keyA,
      n,
      sumH: acc.map((c) => she.finalExpGT(c)),
      cnt,
      sumAll,
      ms: Date.now() - t0
    }
    return cloudResult
  })
}

// Serialize the aggregate for the analyst. This is the only thing that leaves
// the cloud, so the analyst never sees an individual record.
function cloudSerializeResult () {
  const r = cloudResult
  if (r === null) return null
  if (r.mode === 'cross') {
    return {
      mode: 'cross',
      keyA: r.keyA,
      keyB: r.keyB,
      n: r.n,
      cell: r.cell.map((row) => row.map((c) => c.serialize())),
      rowSum: r.rowSum.map((c) => c.serialize()),
      colSum: r.colSum.map((c) => c.serialize())
    }
  }
  return {
    mode: 'mean',
    keyA: r.keyA,
    n: r.n,
    sumH: r.sumH.map((c) => c.serialize()),
    cnt: r.cnt.map((c) => c.serialize()),
    sumAll: r.sumAll.serialize()
  }
}

// Byte size of the aggregate, for the "what actually got sent" display.
function cloudResultSize () {
  const p = cloudSerializeResult()
  if (p === null) return 0
  let n = 0
  const add = (x) => { n += x.length }
  if (p.mode === 'cross') {
    p.cell.forEach((row) => row.forEach(add))
    p.rowSum.forEach(add)
    p.colSum.forEach(add)
  } else {
    p.sumH.forEach(add)
    p.cnt.forEach(add)
    add(p.sumAll)
  }
  return n
}
