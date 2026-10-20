// DOM wiring for the cross tabulation demo.
// All cryptography lives in cross-user.js / cross-cloud.js / cross-analyst.js.
//
// Static text in cross-demo.html is written twice, in <span class="en"> and
// <span class="ja">, and lang.js shows one of them. Text built here is looked
// up in MSG by the current language, and everything is re-rendered when
// lang.js fires 'langchange'.

const ui = {
  ready: false,
  busy: false,
  sent: false,
  aggregated: false,
  decoded: null,
  // the last messages shown, kept as [id, ...args] so that they can be
  // re-rendered in the other language
  status: null,
  sendInfo: null,
  cloudInfo: null
}

// Messages built in JS. A string is used as is; a function gets the arguments
// passed to msg().
const MSG = {
  initializing: { en: 'initializing...', ja: '初期化中...' },
  initFailed: { en: (e) => `initialization failed: ${e}`, ja: (e) => `初期化に失敗した: ${e}` },
  ready: { en: 'ready', ja: '準備完了' },
  error: { en: (e) => `error: ${e}`, ja: (e) => `エラー: ${e}` },
  userCount: { en: (n) => `${n} / ${MAX_USERS} users`, ja: (n) => `${n} / ${MAX_USERS} 人` },
  cloudCount: { en: (n) => `${n} users`, ja: (n) => `${n} 人分` },
  noQuery: { en: '(not set)', ja: '（未指定）' },
  queryCross: { en: (a, b) => `cross tabulation: ${a} x ${b}`, ja: (a, b) => `クロス集計: ${a} x ${b}` },
  queryMean: { en: (a, h) => `mean: ${h} by ${a}`, ja: (a, h) => `平均: ${a} ごとの${h}` },
  userEmpty: { en: 'No data yet.', ja: 'まだデータがありません。' },
  cloudEmpty: { en: 'No ciphertexts received yet.', ja: 'まだ暗号文を受け取っていません。' },
  notAggregated: { en: 'Not aggregated yet.', ja: 'まだ集計していません。' },
  notDecrypted: { en: 'Not decrypted yet.', ja: 'まだ復号していません。' },
  cloudCross: {
    en: (a, b, p, q, size) => `${p} x ${q} cells of ${a} x ${b} and the marginals. ` +
      `The analyst recovers the remaining row and column by subtraction. ${size} bytes in total.`,
    ja: (a, b, p, q, size) => `${a} x ${b} のセル ${p} x ${q} 個と周辺度数。` +
      `残りの 1 行 1 列はアナリストが引き算で復元する。合計 ${size} バイト。`
  },
  cloudMean: {
    en: (a, size) => `Encrypted numerator and denominator for each level of ${a}. ${size} bytes in total.`,
    ja: (a, size) => `${a} の水準ごとの分子（暗号文）と分母（暗号文）。合計 ${size} バイト。`
  },
  decrypted: {
    en: (ms, gt, other) => `Decrypted in ${ms} ms (${gt} GT and ${other} G1/G2 decryptions). ` +
      'Colored cells were decrypted directly; white cells were derived from the marginals by subtraction.',
    ja: (ms, gt, other) => `復号 ${ms} ms（GT ${gt} 回、G1/G2 ${other} 回）。` +
      '色の付いたセルは直接復号したもの、白いセルは周辺度数からの引き算で求めたもの。'
  },
  smallCell: {
    en: `Cells with fewer than ${SMALL_CELL} users are greyed out because they would expose those one or two individuals. ` +
      'Only the display is suppressed; the analyst still holds the decrypted values.',
    ja: `${SMALL_CELL} 人未満のセルはその 1 人か 2 人の情報がそのまま出てしまうため灰色にしている。` +
      'ただし抑制しているのは表示だけで、アナリストは復号した値そのものを持っている。'
  },
  total: { en: 'total', ja: '計' },
  count: { en: 'count', ja: '人数' },
  meanOf: { en: (h) => `mean of ${h}`, ja: (h) => `${h}の平均` },
  overall: { en: 'overall', ja: '全体' },
  encrypting: { en: 'encrypting...', ja: '暗号化中...' },
  sendInfo: {
    en: (n, ms, bytes) => `Encrypted ${n} users in ${ms} ms and sent ${bytes} bytes.`,
    ja: (n, ms, bytes) => `${n} 人分を ${ms} ms で暗号化し、${bytes} バイトを送信した。`
  },
  cloudReceived: { en: 'the cloud received the ciphertexts', ja: 'クラウドが暗号文を受け取った' },
  aggregating: { en: 'aggregating on ciphertexts...', ja: '暗号化したまま集計中...' },
  cloudInfo: {
    en: (n, ms) => `Aggregated ${n} users in ${ms} ms.`,
    ja: (n, ms) => `${n} 人分を ${ms} ms で集計した。`
  },
  aggregated: { en: 'aggregated and sent to the analyst', ja: '集計してアナリストに送った' },
  decryptedStatus: { en: 'received the result and decrypted it', ja: '結果を受信して復号した' },
  querySet: { en: 'sent the query to the cloud', ja: 'クラウドに集計内容を指示した' },
  keyRegen: { en: 'regenerated the keys, so the data was cleared', ja: '鍵を作り直したのでデータを消した' }
}

function msg (id, ...args) {
  const m = tr(MSG[id])
  return typeof m === 'function' ? m(...args) : m
}

function $ (id) {
  return document.getElementById(id)
}

function setText (id, s) {
  const e = $(id)
  if (e) e.textContent = s
}

// Show a message and remember it so that it can be re-rendered when the
// language changes. m is [id, ...args] or null.
function setMsg (id, m) {
  setText(id, m === null ? '' : msg(...m))
}

function el (tag, className, text) {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text !== undefined) e.textContent = text
  return e
}

function newRow (cells) {
  const tr = document.createElement('tr')
  for (const c of cells) tr.appendChild(c)
  return tr
}

function clear (e) {
  while (e.firstChild) e.removeChild(e.firstChild)
}

function excerpt (hex) {
  return hex.length > 20 ? hex.slice(0, 20) + '...' : hex
}

// ---- tabs ----------------------------------------------------------------

function selectTab (index) {
  const tabs = document.querySelectorAll('.advanced-tab')
  const panels = document.querySelectorAll('.advanced-panel-contents')
  for (let i = 0; i < tabs.length; i++) {
    const on = i === index
    tabs[i].classList.toggle('advanced-tab--active', on)
    tabs[i].setAttribute('aria-expanded', on ? 'true' : 'false')
    panels[i].classList.toggle('advanced-panel-contents--active', on)
  }
}

// ---- state ---------------------------------------------------------------

// The demo is a fixed pipeline, so the buttons that are not the next step are
// disabled. Step 1 is supplying data, step 2 is aggregating, step 3 is
// decrypting.
function currentStep () {
  if (!ui.sent) return 1
  if (!ui.aggregated) return 2
  return 3
}

function setStatus (m) {
  ui.status = m
  setMsg('status', m)
}

function refresh () {
  const n = userCount()
  const q = analystGetQuery()
  const step = currentStep()

  setText('user-count', msg('userCount', n))
  setText('cloud-count', msg('cloudCount', cloudCount()))
  setText('query-label', q === null ? msg('noQuery') : queryLabel(q))
  setText('query-label-cloud', q === null ? msg('noQuery') : queryLabel(q))

  for (let i = 1; i <= 3; i++) {
    $('step' + i).classList.toggle('cross-step--active', i === step)
  }

  const busy = ui.busy || !ui.ready
  $('add-one').disabled = busy || userIsFull()
  $('add-10').disabled = busy || userIsFull()
  $('add-30').disabled = busy || userIsFull()
  $('clear-all').disabled = busy || n === 0
  $('send').disabled = busy || n === 0
  $('aggregate').disabled = busy || !ui.sent || q === null
  $('decrypt').disabled = busy || !ui.aggregated
  $('set-query').disabled = busy
  $('regen-key').disabled = busy
  $('mode-cross').disabled = busy
  $('mode-mean').disabled = busy
  $('key-a').disabled = busy
  // key-b is hidden in mean mode rather than disabled, so it only follows busy
  $('key-b').disabled = busy
}

function queryLabel (q) {
  if (q.mode === 'cross') {
    return msg('queryCross', catLabel(q.keyA), catLabel(q.keyB))
  }
  return msg('queryMean', catLabel(q.keyA), healthLabel())
}

function progress (id, done, total) {
  const e = $(id)
  e.max = total
  e.value = done
}

// ---- panel 1: the data supplier -----------------------------------------

// Build the input form. On a rebuild (language change) the current values
// are kept.
function buildForm () {
  const box = $('add-form')
  const prev = box.children.length > 0 ? readForm() : null
  clear(box)
  for (const key of CAT_KEYS) {
    const sel = el('select')
    sel.id = 'in-' + key
    for (let i = 0; i < levelNum(key); i++) {
      const o = el('option', null, levelName(key, i))
      o.value = String(i)
      sel.appendChild(o)
    }
    if (prev !== null) sel.value = String(prev[key])
    const label = el('label', 'cross-field')
    label.appendChild(el('span', 'cross-field-name', catLabel(key)))
    label.appendChild(sel)
    box.appendChild(label)
  }
  const range = el('input')
  range.type = 'range'
  range.id = 'in-health'
  range.min = String(HEALTH.min)
  range.max = String(HEALTH.max)
  range.value = prev === null ? '60' : String(prev.health)
  const out = el('span', 'cross-health-value', range.value)
  range.addEventListener('input', () => { out.textContent = range.value })
  const label = el('label', 'cross-field')
  label.appendChild(el('span', 'cross-field-name', healthLabel()))
  label.appendChild(range)
  label.appendChild(out)
  box.appendChild(label)
}

function readForm () {
  const rec = {}
  for (const key of CAT_KEYS) rec[key] = parseInt($('in-' + key).value, 10)
  rec.health = parseInt($('in-health').value, 10)
  return rec
}

function renderUserTable () {
  const body = $('user-table')
  clear(body)
  const n = userCount()
  for (let i = 0; i < n; i++) {
    const r = userGet(i)
    const cells = CAT_KEYS.map((key) => el('td', null, levelName(key, r[key])))
    cells.push(el('td', null, String(r.health)))
    if (ui.sent) {
      const e = cloudGetExcerpt(i)
      cells.push(el('td', 'hex', e.age))
    }
    body.appendChild(newRow(cells))
  }
  $('user-enc-head').hidden = !ui.sent
  setText('user-empty', n === 0 ? msg('userEmpty') : '')
}

function renderCloudTable () {
  const body = $('cloud-table')
  clear(body)
  const n = cloudCount()
  for (let i = 0; i < n; i++) {
    const e = cloudGetExcerpt(i)
    const cells = CAT_KEYS.map((key) => el('td', 'hex', e[key]))
    cells.push(el('td', 'hex', e.health))
    body.appendChild(newRow(cells))
  }
  setText('cloud-empty', n === 0 ? msg('cloudEmpty') : '')
}

// ---- panel 2: the computing server --------------------------------------

function renderCloudResult () {
  const box = $('cloud-result')
  clear(box)
  const r = cloudGetResult()
  if (r === null) {
    box.appendChild(el('p', 'cross-note', msg('notAggregated')))
    return
  }
  const size = cloudResultSize()
  if (r.mode === 'cross') {
    const p = levelNum(r.keyA)
    const q = levelNum(r.keyB)
    box.appendChild(el('p', 'cross-note',
      msg('cloudCross', catLabel(r.keyA), catLabel(r.keyB), p - 1, q - 1, size)))
    const tbl = el('table', 'cross-hex-table')
    const body = el('tbody')
    for (let i = 0; i < p - 1; i++) {
      const cells = [el('th', null, levelName(r.keyA, i))]
      for (let j = 0; j < q - 1; j++) {
        cells.push(el('td', 'hex', excerpt(r.cell[i][j].serializeToHexStr())))
      }
      body.appendChild(newRow(cells))
    }
    tbl.appendChild(body)
    box.appendChild(tbl)
  } else {
    const p = levelNum(r.keyA)
    box.appendChild(el('p', 'cross-note', msg('cloudMean', catLabel(r.keyA), size)))
    const tbl = el('table', 'cross-hex-table')
    const body = el('tbody')
    for (let i = 0; i < p; i++) {
      body.appendChild(newRow([
        el('th', null, levelName(r.keyA, i)),
        el('td', 'hex', excerpt(r.sumH[i].serializeToHexStr())),
        el('td', 'hex', excerpt(r.cnt[i].serializeToHexStr()))
      ]))
    }
    tbl.appendChild(body)
    box.appendChild(tbl)
  }
}

// ---- panel 3: the analyst ------------------------------------------------

// Fill the attribute selects. On a rebuild (language change) the current
// values are kept; syncQuerySelects() then prunes key-b.
function buildQuerySelects () {
  for (const id of ['key-a', 'key-b']) {
    const sel = $(id)
    const prev = sel.value
    clear(sel)
    for (const key of CAT_KEYS) {
      const o = el('option', null, catLabel(key))
      o.value = key
      sel.appendChild(o)
    }
    sel.value = prev || (id === 'key-a' ? 'age' : 'site')
  }
}

// keyA and keyB must differ, so drop the current keyA from the keyB list.
// Always follow with refresh() so the enabled state matches what is shown.
function syncQuerySelects () {
  const mean = $('mode-mean').checked
  $('key-b-field').hidden = mean
  $('key-b-fixed').hidden = !mean
  const a = $('key-a').value
  const sel = $('key-b')
  const prev = sel.value
  clear(sel)
  for (const key of CAT_KEYS) {
    if (key === a) continue
    const o = el('option', null, catLabel(key))
    o.value = key
    sel.appendChild(o)
  }
  sel.value = (prev !== a && prev) ? prev : sel.options[0].value
}

function renderResult () {
  const box = $('analyst-result')
  clear(box)
  const r = ui.decoded
  if (r === null) {
    box.appendChild(el('p', 'cross-note', msg('notDecrypted')))
    return
  }
  if (r.mode === 'cross') {
    renderCrossTable(box, r)
  } else {
    renderMeanTable(box, r)
  }
  box.appendChild(el('p', 'cross-note', msg('decrypted', r.ms, r.decGT, r.decOther)))
  if (r.mode === 'cross') {
    box.appendChild(el('p', 'cross-note', msg('smallCell')))
  }
}

function renderCrossTable (box, r) {
  const p = levelNum(r.keyA)
  const q = levelNum(r.keyB)
  const tbl = el('table', 'cross-result-table')
  const head = el('thead')
  const hc = [el('th', null, `${catLabel(r.keyA)} \\ ${catLabel(r.keyB)}`)]
  for (let j = 0; j < q; j++) hc.push(el('th', null, levelName(r.keyB, j)))
  hc.push(el('th', 'cross-margin', msg('total')))
  head.appendChild(newRow(hc))
  tbl.appendChild(head)

  const body = el('tbody')
  for (let i = 0; i < p; i++) {
    const cells = [el('th', null, levelName(r.keyA, i))]
    for (let j = 0; j < q; j++) {
      const v = r.count[i][j]
      const td = el('td', r.direct[i][j] ? 'cross-direct' : null, String(v))
      if (v > 0 && v < SMALL_CELL) td.classList.add('cross-small')
      cells.push(td)
    }
    cells.push(el('td', 'cross-margin', String(r.rowSum[i])))
    body.appendChild(newRow(cells))
  }
  const foot = [el('th', 'cross-margin', msg('total'))]
  for (let j = 0; j < q; j++) foot.push(el('td', 'cross-margin', String(r.colSum[j])))
  foot.push(el('td', 'cross-margin', String(r.n)))
  body.appendChild(newRow(foot))
  tbl.appendChild(body)
  box.appendChild(tbl)
}

function renderMeanTable (box, r) {
  const p = levelNum(r.keyA)
  const tbl = el('table', 'cross-result-table')
  const head = el('thead')
  head.appendChild(newRow([
    el('th', null, catLabel(r.keyA)),
    el('th', null, msg('count')),
    el('th', null, msg('meanOf', healthLabel()))
  ]))
  tbl.appendChild(head)
  const body = el('tbody')
  for (let i = 0; i < p; i++) {
    const row = [
      el('th', null, levelName(r.keyA, i)),
      el('td', null, String(r.cnt[i])),
      el('td', 'cross-direct', r.mean[i] === null ? '-' : r.mean[i].toFixed(1))
    ]
    if (r.cnt[i] > 0 && r.cnt[i] < SMALL_CELL) {
      row[2].classList.add('cross-small')
    }
    body.appendChild(newRow(row))
  }
  body.appendChild(newRow([
    el('th', 'cross-margin', msg('overall')),
    el('td', 'cross-margin', String(r.n)),
    el('td', 'cross-margin', r.overall === null ? '-' : r.overall.toFixed(1))
  ]))
  tbl.appendChild(body)
  box.appendChild(tbl)
}

// ---- language ------------------------------------------------------------

// Redraw everything that was built from JS in the new language. The state
// itself (records, ciphertexts, results) is untouched.
function onLangChange () {
  setLang(currentLang())
  buildForm()
  buildQuerySelects()
  syncQuerySelects()
  renderUserTable()
  renderCloudTable()
  renderCloudResult()
  renderResult()
  setMsg('send-info', ui.sendInfo)
  setMsg('cloud-info', ui.cloudInfo)
  if (ui.status !== null) setMsg('status', ui.status)
  refresh()
}

// ---- actions -------------------------------------------------------------

function invalidateAggregate () {
  ui.aggregated = false
  ui.decoded = null
  analystClearPacket()
  renderCloudResult()
  renderResult()
}

// Adding or removing a record invalidates everything downstream: the cloud
// holds ciphertexts of the old data set and the analyst holds an aggregate of
// it.
function onDataChanged () {
  ui.sent = false
  cloudClear()
  invalidateAggregate()
  renderUserTable()
  renderCloudTable()
  ui.sendInfo = null
  ui.cloudInfo = null
  setMsg('send-info', null)
  setMsg('cloud-info', null)
  refresh()
}

function withBusy (label, fn) {
  ui.busy = true
  setStatus(label)
  refresh()
  return fn().catch((e) => {
    setStatus(['error', e.message])
    throw e
  }).finally(() => {
    ui.busy = false
    refresh()
  })
}

function onSend () {
  withBusy(['encrypting'], () => {
    const t0 = Date.now()
    return userEncryptAll(analystPpk(), (d, t) => progress('user-progress', d, t))
      .then((packets) => {
        const ms = Date.now() - t0
        let bytes = 0
        for (const p of packets) {
          for (const key of CAT_KEYS) {
            for (const b of p.onehot[key].g1) bytes += b.length
            for (const b of p.onehot[key].g2) bytes += b.length
          }
          bytes += p.health.g1.length + p.health.g2.length
        }
        cloudReceive(packets)
        ui.sent = true
        invalidateAggregate()
        renderUserTable()
        renderCloudTable()
        ui.sendInfo = ['sendInfo', packets.length, ms, bytes]
        setMsg('send-info', ui.sendInfo)
        setStatus(['cloudReceived'])
        selectTab(1)
      })
  })
}

function onAggregate () {
  const q = analystGetQuery()
  withBusy(['aggregating'], () => {
    const run = q.mode === 'cross'
      ? cloudCrossTab(q.keyA, q.keyB, (d, t) => progress('cloud-progress', d, t))
      : cloudMean(q.keyA, (d, t) => progress('cloud-progress', d, t))
    return run.then((r) => {
      ui.aggregated = true
      ui.decoded = null
      renderCloudResult()
      renderResult()
      // Sending has nothing of its own to show, so it is folded in here. The
      // tab is left as is on purpose: the encrypted aggregate above is the
      // point of this panel.
      analystReceive(cloudSerializeResult())
      ui.cloudInfo = ['cloudInfo', r.n, r.ms]
      setMsg('cloud-info', ui.cloudInfo)
      setStatus(['aggregated'])
    })
  })
}

// Receiving on its own has nothing to show, so it is folded into the decrypt
// button. The cloud already pushed the aggregate when it finished, so this
// just receives the same one again.
function onDecrypt () {
  analystReceive(cloudSerializeResult())
  ui.decoded = analystDecrypt()
  renderResult()
  setStatus(['decryptedStatus'])
  refresh()
}

function onSetQuery () {
  const mode = $('mode-mean').checked ? 'mean' : 'cross'
  analystSetQuery(mode, $('key-a').value, $('key-b').value)
  invalidateAggregate()
  setStatus(['querySet'])
  selectTab(1)
  refresh()
}

function onRegenKey () {
  analystInit()
  setText('pub-key', analystPub().serializeToHexStr())
  setText('sec-key', analystSec().serializeToHexStr())
  // the old ciphertexts cannot be decrypted with the new key
  userClear()
  onDataChanged()
  setStatus(['keyRegen'])
}

// ---- boot ----------------------------------------------------------------

window.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang())
  buildForm()
  buildQuerySelects()
  renderUserTable()
  renderCloudTable()
  renderCloudResult()
  renderResult()

  document.querySelectorAll('.advanced-tab').forEach((btn, i) => {
    btn.addEventListener('click', () => selectTab(i))
  })
  $('add-one').addEventListener('click', () => {
    userAdd(readForm())
    onDataChanged()
  })
  $('add-10').addEventListener('click', () => {
    userAddRandom(10)
    onDataChanged()
  })
  $('add-30').addEventListener('click', () => {
    userAddRandom(30)
    onDataChanged()
  })
  $('clear-all').addEventListener('click', () => {
    userClear()
    onDataChanged()
  })
  $('send').addEventListener('click', onSend)
  $('aggregate').addEventListener('click', onAggregate)
  $('decrypt').addEventListener('click', onDecrypt)
  $('set-query').addEventListener('click', onSetQuery)
  $('regen-key').addEventListener('click', onRegenKey)
  const onQueryEdit = () => { syncQuerySelects(); refresh() }
  $('mode-cross').addEventListener('change', onQueryEdit)
  $('mode-mean').addEventListener('change', onQueryEdit)
  $('key-a').addEventListener('change', onQueryEdit)
  onQueryEdit()
  document.addEventListener('langchange', onLangChange)

  // hashSize 1024 and tryNum 16 cover a plaintext of 16384, and the largest
  // value decrypted here is the health sum, at most 100 x 100 (cross-demo-plan.md 7).
  she.init(she.BN254, 1024, 16).then(() => {
    analystInit()
    analystSetQuery('cross', 'age', 'site')
    setText('pub-key', analystPub().serializeToHexStr())
    setText('sec-key', analystSec().serializeToHexStr())
    ui.ready = true
    setStatus(['ready'])
    refresh()
  }).catch((e) => {
    setStatus(['initFailed', e.message])
  })
})
