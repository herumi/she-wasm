function getValue (name) { return document.getElementsByName(name)[0].value }
function setValue (name, val) { document.getElementsByName(name)[0].value = val }
function getText (name) { return document.getElementsByName(name)[0].innerText }
function setText (name, val) { document.getElementsByName(name)[0].innerText = val }
function newCell (text, className) {
  const e = document.createElement('td')
  if (className) e.className = className
  e.textContent = text
  return e
}
function newRow (cells) {
  const tr = document.createElement('tr')
  cells.forEach((c) => tr.appendChild(c))
  return tr
}

let sec = null
let pub = null

function clearTable () {
  document.getElementById('client_table').innerHTML = ''
  document.getElementById('server_table').innerHTML = ''
}

function initShe (curveType) {
  const initSecPub = () => {
    clearTable()
    sec = new she.SecretKey()
    sec.setByCSPRNG()
    sec.dump('sec=')
    setText('sec', sec.serializeToHexStr())
    pub = sec.getPublicKey()
    pub.dump('pub=')
    setText('pub', pub.serializeToHexStr())
    console.log(`curveType=${curveType}`)
    setText('status', `curveType=${curveType} status ok`)
  }
  she.init(curveType).then(() => {
    setText('status', `curveType=${curveType} status initializing...`)
    if (curveType === she.BN254) {
      fetch('https://herumi.github.io/she-dlp-table/she-dlp-0-20-gt.bin')
        .then(res => res.arrayBuffer())
        .then(buffer => {
          const a = new Uint8Array(buffer)
          she.loadTableForGTDLP(a)
          console.log('load Table done')
          initSecPub(she)
        })
    } else {
      initSecPub(she)
    }
  })
}

let prevSelectedCurve = 0
// scripts are loaded in <head>, so wait for the DOM before touching it
window.addEventListener('DOMContentLoaded', () => { initShe(0) })

function onChangeSelectCurve () {
  const obj = document.selectCurve.curveType
  const idx = obj.selectedIndex
  const curveType = obj.options[idx].value | 0
  if (curveType === prevSelectedCurve) return
  prevSelectedCurve = curveType
  initShe(curveType)
}

function bench (label, count, func) {
  const start = Date.now()
  for (let i = 0; i < count; i++) {
    func()
  }
  const end = Date.now()
  const t = (end - start) / count
  setText(label, t)
}

function benchAll () {
  const C1 = 50
  const C2 = 10
//    const L = 16 // large value
//  const L = 8 // small value
  const m = ((1 << 30) - 1234) * 1
  bench('EncG1T', C1, () => { pub.encG1(m) })
  bench('EncG2T', C1, () => { pub.encG2(m) })
  bench('EncGTT', C2, () => { pub.encGT(m) })
  const c11 = pub.encG1(m)
  const c12 = pub.encG1(m)
  const c21 = pub.encG2(m)
  const c22 = pub.encG2(m)
  const ct1 = pub.encGT(m)
  const ct2 = pub.encGT(m)
  bench('AddG1T', C1 * 10, () => { she.add(c11, c12) })
  bench('AddG2T', C1 * 10, () => { she.add(c21, c22) })
  bench('AddGTT', C1 * 10, () => { she.add(ct1, ct2) })

  bench('MulT', C2, () => { she.mul(c11, c21) })

//  bench('DecG1T', C2, () => { sec.dec(c11) })
//  bench('DecG2T', C2, () => { sec.dec(c21) })
  bench('DecGTT', C2, () => { sec.dec(ct1) })
  const cts = pub.encGT(1234)
  bench('DecGTsT', C2, () => { sec.dec(cts) })

  bench('DecG1ViaGTT', C2, () => { sec.decViaGT(c11) })
  bench('DecG2ViaGTT', C2, () => { sec.decViaGT(c21) })

//    bench('ReRandG1T', C2, () => { ppub.reRand(c11) })
 //   bench('ReRandG2T', C2, () => { ppub.reRand(c21) })
  //  bench('ReRandGTT', C2, () => { ppub.reRand(ct1) })

  const ppub = new she.PrecomputedPublicKey()
  ppub.init(pub)
  bench('PPKencG1T', C1, () => { ppub.encG1(m) })
  bench('PPKencG2T', C1, () => { ppub.encG2(m) })
  bench('PPKencGTT', C1, () => { ppub.encGT(m) })
}

function appendXY (x, y) {
  console.log('x = ' + x + ', y = ' + y)
  const c1 = pub.encG1(x)
  const c2 = pub.encG2(y)
  document.getElementById('client_table').appendChild(newRow([
    newCell(x),
    newCell(y),
    newCell(c1.serializeToHexStr(), 'encG1x'),
    newCell(c2.serializeToHexStr(), 'encG2y')
  ]))
}

function append () {
  const v = getValue('append')
  const vs = v.split(',')
  const x = parseInt(vs[0])
  const y = parseInt(vs[1])
  appendXY(x, y)
}

function appendRand () {
  const tbl = [
    [1, 2], [-2, 1], [4, 3], [5, -2], [6, 1]
  ]
  tbl.forEach(p => appendXY(p[0], p[1]))
}

function send () {
  const ct1 = []
  document.querySelectorAll('.encG1x').forEach((e) => {
    ct1.push(e.textContent)
  })
  const ct2 = []
  document.querySelectorAll('.encG2y').forEach((e) => {
    ct2.push(e.textContent)
  })
  const obj = document.getElementById('server_table')
  obj.innerHTML = ''
  for (let i = 0; i < ct1.length; i++) {
    obj.appendChild(newRow([
      newCell(ct1[i], 'encG1xS'),
      newCell(ct2[i], 'encG2yS'),
      newCell('', 'encGTxyS')
    ]))
  }
}

function mul () {
  document.querySelectorAll('.encG1xS').forEach((e) => {
    const e2 = e.nextElementSibling
    const c1 = she.deserializeHexStrToCipherTextG1(e.textContent)
    const c2 = she.deserializeHexStrToCipherTextG2(e2.textContent)
    const ct = she.mul(c1, c2)
    e2.nextElementSibling.textContent = ct.serializeToHexStr()
  })
}

function sum () {
  let csum = pub.encGT(0)
  document.querySelectorAll('.encGTxyS').forEach((e) => {
    const ct = she.deserializeHexStrToCipherTextGT(e.textContent)
    csum = she.add(csum, ct)
  })
  setText('encSumS', csum.serializeToHexStr())
}

function mulSum () {
  mul()
  sum()
}

function recv () {
  setText('encSumC', getText('encSumS'))
}

function dec () {
  const s = getText('encSumC')
  const ct = she.deserializeHexStrToCipherTextGT(s)
  const v = sec.dec(ct)
  setText('ret', v)
}
