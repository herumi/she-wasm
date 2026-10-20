// The analyst. Holds the key pair and decrypts the aggregate.
// The analyst never receives an individual record: only what the cloud
// aggregated. This file must not touch the DOM.

let sec = null
let pub = null
let ppk = null
let analystQuery = null
let analystPacket = null

function analystSec () { return sec }
function analystPub () { return pub }
function analystPpk () { return ppk }
function analystGetQuery () { return analystQuery }
function analystHasPacket () { return analystPacket !== null }

function analystInit () {
  if (ppk !== null) ppk.destroy()
  sec = new she.SecretKey()
  sec.setByCSPRNG()
  pub = sec.getPublicKey()
  ppk = new she.PrecomputedPublicKey()
  ppk.init(pub)
  analystPacket = null
}

// mode is 'cross' or 'mean'. keyB is unused for 'mean'.
function analystSetQuery (mode, keyA, keyB) {
  analystQuery = { mode, keyA, keyB }
  analystPacket = null
  return analystQuery
}

function analystReceive (packet) {
  analystPacket = packet
  return packet
}

function analystClearPacket () {
  analystPacket = null
}

// Decrypt the cross tabulation and rebuild the full table.
//
// The cloud only computed cells with i < p-1 and j < q-1; the rest comes from
// the marginals (cross-demo-plan.md 5.2). Rows and columns whose marginal is zero are
// filled with zeros without any GT decryption.
function analystDecryptCrossTab () {
  const packet = analystPacket
  const p = levelNum(packet.keyA)
  const q = levelNum(packet.keyB)
  const n = packet.n
  const t0 = Date.now()
  let decGT = 0

  const rowSum = packet.rowSum.map((b) => sec.dec(deserG1(b)))
  const colSum = packet.colSum.map((b) => sec.dec(deserG2(b)))

  const count = []
  const direct = []
  for (let i = 0; i < p; i++) {
    count.push(new Array(q).fill(0))
    direct.push(new Array(q).fill(false))
  }

  for (let i = 0; i < p - 1; i++) {
    for (let j = 0; j < q - 1; j++) {
      if (rowSum[i] === 0 || colSum[j] === 0) continue
      count[i][j] = sec.dec(deserGT(packet.cell[i][j]))
      direct[i][j] = true
      decGT++
    }
  }

  // last column
  for (let i = 0; i < p - 1; i++) {
    let s = 0
    for (let j = 0; j < q - 1; j++) s += count[i][j]
    count[i][q - 1] = rowSum[i] - s
  }
  // last row
  for (let j = 0; j < q - 1; j++) {
    let s = 0
    for (let i = 0; i < p - 1; i++) s += count[i][j]
    count[p - 1][j] = colSum[j] - s
  }
  // bottom right corner
  let corner = n
  for (let i = 0; i < p - 1; i++) corner -= rowSum[i]
  for (let j = 0; j < q - 1; j++) corner -= colSum[j]
  for (let i = 0; i < p - 1; i++) {
    for (let j = 0; j < q - 1; j++) corner += count[i][j]
  }
  count[p - 1][q - 1] = corner

  return {
    mode: 'cross',
    keyA: packet.keyA,
    keyB: packet.keyB,
    n,
    count,
    direct,
    rowSum,
    colSum,
    decGT,
    decOther: p + q,
    ms: Date.now() - t0
  }
}

// Decrypt the per level sums and divide by the counts.
function analystDecryptMean () {
  const packet = analystPacket
  const p = levelNum(packet.keyA)
  const t0 = Date.now()
  let decGT = 0

  const cnt = packet.cnt.map((b) => sec.dec(deserG1(b)))
  const sum = []
  const mean = []
  for (let i = 0; i < p; i++) {
    if (cnt[i] === 0) {
      sum.push(0)
      mean.push(null)
      continue
    }
    const s = sec.dec(deserGT(packet.sumH[i]))
    decGT++
    sum.push(s)
    mean.push(s / cnt[i])
  }
  const sumAll = sec.dec(deserG1(packet.sumAll))
  const overall = packet.n === 0 ? null : sumAll / packet.n

  return {
    mode: 'mean',
    keyA: packet.keyA,
    n: packet.n,
    cnt,
    sum,
    mean,
    overall,
    decGT,
    decOther: p + 1,
    ms: Date.now() - t0
  }
}

function analystDecrypt () {
  return analystPacket.mode === 'cross' ? analystDecryptCrossTab() : analystDecryptMean()
}
