function getValue (name) {
  const e = document.getElementsByName(name)
console.log(`getValue ${e} ${e.length}`)
  return e.length > 0 ? e[0].value : 0
}
function getText (name) {
  const e = document.getElementsByName(name)
console.log(`getText ${e} ${e.length}`)
  return e.length > 0 ? e[0].innerText : ''
}
function setText (name, val) {
  const e = document.getElementsByName(name)
console.log(`setText ${e} ${e.length}`)
  if (e.length > 0) e[0].innerText = val
}
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
let buttonEls = null

function clearTable () {
  document.getElementById('client_table').innerHTML = ''
  document.getElementById('server_table').innerHTML = ''
  document.getElementById('cross_table').innerHTML = ''
  setText('encXsumS', '')
  setText('encYsumS', '')
  setText('encSumS', '')
  setText('encXsumC', '')
  setText('encYsumC', '')
  setText('encSumC', '')
}

function handleClick (ev) {
  const tabPanelEls = document.querySelectorAll('.advanced-panel-contents ')

  for (let i = 0; i < buttonEls.length; i++) {
    const btn = buttonEls[i]
    // the buttons contain en/ja spans, so ev.target may be a span; use currentTarget
    if (btn == ev.currentTarget) {
      btn.classList.add('advanced-tab--active')
      btn.setAttribute('aria-expanded', 'true')

      tabPanelEls[i].classList.add('advanced-panel-contents--active')
    } else {
      btn.classList.remove('advanced-tab--active')
      btn.setAttribute('aria-expanded', 'false')

      tabPanelEls[i].classList.remove('advanced-panel-contents--active')
    }
  }
}

// scripts are loaded in <head>, so wait for the DOM before touching it
window.addEventListener('DOMContentLoaded', () => {
  const curveType = 0
  clearTable()
  she.init(curveType).then(() => {
    setText('status', `initializing...`)

    sec = new she.SecretKey()
    sec.setByCSPRNG()
    setText('sec', sec.serializeToHexStr())
    sec.dump('sec=')
    pub = sec.getPublicKey()
    pub.dump('pub=')
    setText('pub', pub.serializeToHexStr())

    buttonEls = document.querySelectorAll('.advanced-tab')
    buttonEls.forEach((btn) => {
      btn.addEventListener('click', handleClick)
    })
    setText('status', `ok`)
  })
})

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
  if ((x in [0,1] && y in [0, 1])) {
    appendXY(x, y)
  } else {
    alert(`x=${x} and y=${y} must be in [0,1]`)
  }
}

function appendRand () {
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() * 2) | 0
    const y = (Math.random() * 2) | 0
    appendXY(x, y)
  }
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

function mulXY () {
  let xSum = pub.encG1(0)
  let ySum = pub.encG2(0)
  document.querySelectorAll('.encG1xS').forEach((e) => {
    const e2 = e.nextElementSibling
    const c1 = she.deserializeHexStrToCipherTextG1(e.textContent)
    const c2 = she.deserializeHexStrToCipherTextG2(e2.textContent)
    const ct = she.mul(c1, c2)
    xSum = she.add(xSum, c1)
    ySum = she.add(ySum, c2)
    e2.nextElementSibling.textContent = ct.serializeToHexStr()
  })
  setText('encXsumS', xSum.serializeToHexStr())
  setText('encYsumS', ySum.serializeToHexStr())
}

function sumCross () {
  // sum Enc(xi yi)
  let sum = pub.encGT(0)
  document.querySelectorAll('.encGTxyS').forEach((e) => {
    const ct = she.deserializeHexStrToCipherTextGT(e.textContent)
    sum = she.add(sum, ct)
  })
  setText('encSumS', sum.serializeToHexStr())
}

function mulSum () {
  mulXY()
  sumCross()
}

function recv () {
  setText('encXsumC', getText('encXsumS'))
  setText('encYsumC', getText('encYsumS'))
  setText('encSumC', getText('encSumS'))
}

function dec () {
  const x = sec.dec(she.deserializeHexStrToCipherTextG1(getText('encXsumC')))
  const y = sec.dec(she.deserializeHexStrToCipherTextG2(getText('encYsumC')))
  const xy = sec.dec(she.deserializeHexStrToCipherTextGT(getText('encSumC')))
  const n = document.getElementById('client_table').children.length
  console.log(`n=${n}, x=${x}, y=${y}, xy=${xy}`)
  const obj = document.getElementById('cross_table')
  obj.innerHTML = ''

  const tbl = [
    ['#{y=0}', n - x - y + xy, x - xy, n - y],
    ['#{y=1}', y - xy, xy, y],
    ['sum', n - x, x, n],
  ]
  for (let i = 0; i < tbl.length; i++) {
    obj.appendChild(newRow(tbl[i].map((v) => newCell(v))))
  }
}
