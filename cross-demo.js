function getValue (name) { return document.getElementsByName(name)[0].value }
function getText (name) { return document.getElementsByName(name)[0].innerText }
function setText (name, val) { document.getElementsByName(name)[0].innerText = val }

let sec = null
let pub = null
let buttonEls = null

function clearTable () {
  $('#client_table').html('')
  $('#server_table').html('')
  $('#cross_table').html('')
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
    if (btn == ev.target) {
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

{
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
}

function appendXY (x, y) {
  console.log('x = ' + x + ', y = ' + y)
  const c1 = pub.encG1(x)
  const c2 = pub.encG2(y)
  $('#client_table').append(
    $('<tr>').append(
      $('<td>').text(x)
    ).append(
      $('<td>').text(y)
    ).append(
      $('<td class="encG1x">').text(c1.serializeToHexStr())
    ).append(
      $('<td class="encG2y">').text(c2.serializeToHexStr())
    )
  )
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
  /*
  document.querySelectorAll('.encG1x').forEach((e) => {
    ct1.push(e.innerText)
  })
  */
  $('.encG1x').each(function () {
    ct1.push($(this).text())
  })
  const ct2 = []
  $('.encG2y').each(function () {
    ct2.push($(this).text())
  })
  const obj = $('#server_table')
  obj.html('')
  for (let i = 0; i < ct1.length; i++) {
    const t = $('<tr>')
    t.append(
      $('<td class="encG1xS">').append(ct1[i])
    ).append(
      $('<td class="encG2yS">').append(ct2[i])
    ).append(
      $('<td class="encGTxyS">').append('')
    )
    obj.append(t)
  }
}

function mulXY () {
  let xSum = pub.encG1(0)
  let ySum = pub.encG2(0)
  $('.encG1xS').each(function () {
    const o = $(this)
    const c1 = she.deserializeHexStrToCipherTextG1(o.text())
    const c2 = she.deserializeHexStrToCipherTextG2(o.next().text())
    const ct = she.mul(c1, c2)
    xSum = she.add(xSum, c1)
    ySum = she.add(ySum, c2)
    o.next().next().text(ct.serializeToHexStr())
  })
  setText('encXsumS', xSum.serializeToHexStr())
  setText('encYsumS', ySum.serializeToHexStr())
}

function sumCross () {
  // sum Enc(xi yi)
  let sum = pub.encGT(0)
  $('.encGTxyS').each(function () {
    const s = $(this).text()
    const ct = she.deserializeHexStrToCipherTextGT(s)
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
  const n = $('#client_table').children().length
  console.log(`n=${n}, x=${x}, y=${y}, xy=${xy}`)
  const obj = $('#cross_table').html('')

  const tbl = [
    ['#{y=0}', n - x - y + xy, x - xy, n - y],
    ['#{y=1}', y - xy, xy, y],
    ['sum', n - x, x, n],
  ]
  for (let i = 0; i < tbl.length; i++) {
    const t = $('<tr>')
    t.append(
      $('<td>').append(tbl[i][0])
    ).append(
      $('<td>').append(tbl[i][1])
    ).append(
      $('<td>').append(tbl[i][2])
    ).append(
      $('<td>').append(tbl[i][3])
    )
    obj.append(t)
  }
}
