// Shared definitions for the cross tabulation demo.
// This file must not touch the DOM.

// Display language, 'en' or 'ja'. cross-ui.js sets it from lang.js and
// re-renders when it changes. Every user visible string in the schema is an
// { en, ja } pair looked up through tr().
let LANG = 'ja'

function setLang (lang) {
  LANG = lang
}

function tr (s) {
  return s[LANG]
}

const SCHEMA = {
  age: {
    label: { en: 'age', ja: '年齢' },
    levels: [
      { en: '10s', ja: '10代' },
      { en: '20s', ja: '20代' },
      { en: '30s', ja: '30代' },
      { en: '40s', ja: '40代' },
      { en: '50s', ja: '50代' },
      { en: '60s', ja: '60代' },
      { en: '70s', ja: '70代' }
    ]
  },
  site: {
    label: { en: 'site', ja: '拠点' },
    levels: [
      { en: 'Tokyo', ja: '東京' },
      { en: 'Osaka', ja: '大阪' },
      { en: 'Matsuyama', ja: '松山' },
      { en: 'other', ja: 'その他' }
    ]
  },
  attendance: {
    label: { en: 'attendance', ja: '出社率' },
    levels: [
      { en: 'under 20%', ja: '20%未満' },
      { en: '20% to 50%', ja: '20%以上50%未満' },
      { en: '50% or more', ja: '50%以上' }
    ]
  },
  gender: {
    label: { en: 'gender', ja: '性別' },
    levels: [
      { en: 'male', ja: '男' },
      { en: 'female', ja: '女' },
      { en: 'other', ja: 'その他' }
    ]
  }
}
const HEALTH = { key: 'health', label: { en: 'health score', ja: '健やか度' }, min: 0, max: 100 }
const CAT_KEYS = Object.keys(SCHEMA)

function catLabel (key) {
  return tr(SCHEMA[key].label)
}

function levelName (key, i) {
  return tr(SCHEMA[key].levels[i])
}

function healthLabel () {
  return tr(HEALTH.label)
}

// The demo is capped at 100 users; see cross-demo-plan.md section 1.
const MAX_USERS = 100
// Cells smaller than this are greyed out on screen; see cross-demo-plan.md section 5.4.
const SMALL_CELL = 3

function levelNum (key) {
  return SCHEMA[key].levels.length
}

function toOneHot (key, level) {
  const v = new Array(levelNum(key)).fill(0)
  v[level] = 1
  return v
}

function pickWeighted (w) {
  let total = 0
  for (const x of w) total += x
  let r = Math.random() * total
  for (let i = 0; i < w.length; i++) {
    r -= w[i]
    if (r < 0) return i
  }
  return w.length - 1
}

function clamp (v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v)
}

// Generate a record from a slightly skewed and correlated distribution so that
// the resulting tables do not look uniform.
function randomRecord () {
  const age = pickWeighted([6, 18, 24, 22, 16, 10, 4])
  const site = pickWeighted([50, 25, 15, 10])
  // people at the Tokyo office come in less often
  const attendance = pickWeighted(site === 0 ? [40, 35, 25] : [20, 35, 45])
  const gender = pickWeighted([55, 42, 3])
  // health depends on how often one comes to the office, and drops with age
  const base = [58, 64, 70][attendance] - (age - 3) * 2
  const health = clamp(Math.round(base + (Math.random() - 0.5) * 36), HEALTH.min, HEALTH.max)
  return { age, site, attendance, gender, health }
}

// Deserialization helpers shared by the cloud and the analyst.
function deserG1 (buf) {
  const c = new she.CipherTextG1()
  c.deserialize(buf)
  return c
}

function deserG2 (buf) {
  const c = new she.CipherTextG2()
  c.deserialize(buf)
  return c
}

function deserGT (buf) {
  const c = new she.CipherTextGT()
  c.deserialize(buf)
  return c
}

// Milliseconds of work to do before yielding to the browser. Yielding by a
// fixed step count is wasteful here because one step costs anywhere from 4 ms
// (encryption) to 70 ms (a 7x4 cross tabulation), and a nested setTimeout is
// clamped to 4 ms by browsers.
const CHUNK_MS = 60

// Run `total` steps, yielding every CHUNK_MS so that the progress bar can be
// repainted. Returns a Promise.
function runChunked (total, step, onProgress) {
  return new Promise((resolve, reject) => {
    let i = 0
    const tick = () => {
      const limit = Date.now() + CHUNK_MS
      try {
        do {
          step(i)
          i++
        } while (i < total && Date.now() < limit)
      } catch (e) {
        reject(e)
        return
      }
      if (onProgress) onProgress(i, total)
      if (i < total) {
        setTimeout(tick, 0)
      } else {
        resolve()
      }
    }
    if (total === 0) {
      resolve()
    } else {
      setTimeout(tick, 0)
    }
  })
}
