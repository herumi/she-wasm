function getValue (name) { return document.getElementsByName(name)[0].value }
function setValue (name, val) { document.getElementsByName(name)[0].value = val }
function getText (name) { return document.getElementsByName(name)[0].innerText }
function setText (name, val) { document.getElementsByName(name)[0].innerText = val }

function loadScript (url, callback) {
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = url
  if (script.readyState) {
    script.onreadystatechange = () => {
      if (script.readyState === 'loaded' || script.readyState === 'complete') {
        script.onreadystatechange = null
        callback()
      }
    }
  } else {
    script.onload = () => callback()
  }
  document.getElementsByTagName('head')[0].appendChild(script)
}

let sec = null
let pub = null

function clearTable () {
  $('#client_table').html('')
  $('#server_table').html('')
}

function initShe (curveType) {
  const initSecPub = () => {
    clearTable()
    sec = new she.SecretKey()
    sec.setByCSPRNG()
    sec.dump('sec=')
    pub = sec.getPublicKey()
    pub.dump('pub=')
    console.log(`curveType=${curveType}`)
    setText('status', `curveType=${curveType} status ok`)
  }
  setText('status', `curveType=${curveType} status initializing...`)
  she.init(curveType).then(() => {
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
loadScript('./she_c.js', () => {
  initShe(prevSelectedCurve)
})

function onChangeSelectCurve () {
  const obj = document.selectCurve.curveType
  const idx = obj.selectedIndex
  const curveType = obj.options[idx].value | 0
  if (curveType === prevSelectedCurve) return
  prevSelectedCurve = curveType
  const srcName = curveType === 0 ? './she_c.js' : './she_c384.js'
  console.log(`srcName=${srcName}`)
  loadScript(srcName, () => {
    initShe(curveType)
  })
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
  $('.encG1x').each(function () {
    ct1.push($(this).text())
  })
  const ct2 = []
  $('.encG2y').each(function () {
    ct2.push($(this).text())
  })
  const obj = $('#server_table')
  obj.html('')
  {
    const header = [
      'Enc(x)', 'Enc(y)', 'Enc(x * y)'
    ]
    const t = $('<tr>').attr('id', 'header')
    for (let i = 0; i < header.length; i++) {
      t.append(
        $('<th>').append(header[i])
      )
    }
    obj.append(t)
  }
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

function mul () {
  $('.encG1xS').each(function () {
    const o = $(this)
    const c1 = she.deserializeHexStrToCipherTextG1(o.text())
    const c2 = she.deserializeHexStrToCipherTextG2(o.next().text())
    const ct = she.mul(c1, c2)
    o.next().next().text(ct.serializeToHexStr())
  })
}

function sum () {
  let csum = pub.encGT(0)
  $('.encGTxyS').each(function () {
    const s = $(this).text()
    const ct = she.deserializeHexStrToCipherTextGT(s)
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
