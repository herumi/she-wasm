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

function setTableHeader(obj, header) {
  obj.innerHTML = ''
  const t = document.createElement('tr')
  t.id = 'header'
  for (let i = 0; i < header.length; i++) {
    const th = document.createElement('th')
    th.textContent = header[i]
    t.appendChild(th)
  }
  obj.appendChild(t)
}

function clearTable () {
  setTableHeader(document.getElementById('client_table'), ['x', 'y', 'EncG1(x)', 'EncG2(y)'])
  setTableHeader(document.getElementById('server_table'), ['EncG1(x)', 'EncG2(y)', 'EncGT(x * y)'])
}

function initShe (curveType) {
  const initSecPub = () => {
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
  clearTable()
  setText('status', `curveType=${curveType} status initializing...`)
  she.init(curveType).then(() => {
    if (curveType == she.BN254) {
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

function onChangeSelectCurve () {
  const obj = document.selectCurve.curveType
  const idx = obj.selectedIndex
  const curveType = obj.options[idx].value | 0
  if (curveType === prevSelectedCurve) return
  prevSelectedCurve = curveType
  initShe(curveType)
}

function append () {
  let v = getValue('append')
  let vs = v.split(',')
  let x = parseInt(vs[0])
  let y = parseInt(vs[1])
  console.log('x = ' + x + ', y = ' + y)
  let c1 = pub.encG1(x)
  let c2 = pub.encG2(y)
  document.getElementById('client_table').appendChild(newRow([
    newCell(x),
    newCell(y),
    newCell(c1.serializeToHexStr(), 'encG1x'),
    newCell(c2.serializeToHexStr(), 'encG2y')
  ]))
}

function send () {
  let ct1 = []
  document.querySelectorAll('.encG1x').forEach((e) => {
    ct1.push(e.textContent)
  })
  let ct2 = []
  document.querySelectorAll('.encG2y').forEach((e) => {
    ct2.push(e.textContent)
  })
  let obj = document.getElementById('server_table')
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
    let c1 = she.deserializeHexStrToCipherTextG1(e.textContent)
    let c2 = she.deserializeHexStrToCipherTextG2(e2.textContent)
    let ct = she.mul(c1, c2)
    e2.nextElementSibling.textContent = ct.serializeToHexStr()
  })
}

function sum () {
  let csum = pub.encGT(0)
  document.querySelectorAll('.encGTxyS').forEach((e) => {
    let ct = she.deserializeHexStrToCipherTextGT(e.textContent)
    csum = she.add(csum, ct)
  })
  setText('encSumS', csum.serializeToHexStr())
}

function recv () {
  setText('encSumC', getText('encSumS'))
}

function dec () {
  let s = getText('encSumC')
  let ct = she.deserializeHexStrToCipherTextGT(s)
  let v = sec.dec(ct)
  setText('ret', v)
}
