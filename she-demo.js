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

function setTableHeader(obj, header) {
  obj.html('')
  let t = $('<tr>').attr('id', 'header')
  for (let i = 0; i < header.length; i++) {
    t.append(
      $('<th>').append(header[i])
    )
  }
  obj.append(t)
}

function clearTable () {
  setTableHeader($('#client_table'), ['x', 'y', 'EncG1(x)', 'EncG2(y)'])
  setTableHeader($('#server_table'), ['EncG1(x)', 'EncG2(y)', 'EncGT(x * y)'])
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

function append () {
  let v = getValue('append')
  let vs = v.split(',')
  let x = parseInt(vs[0])
  let y = parseInt(vs[1])
  console.log('x = ' + x + ', y = ' + y)
  let c1 = pub.encG1(x)
  let c2 = pub.encG2(y)
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

function send () {
  let ct1 = []
  $('.encG1x').each(function () {
    ct1.push($(this).text())
  })
  let ct2 = []
  $('.encG2y').each(function () {
    ct2.push($(this).text())
  })
  let obj = $('#server_table')
  for (let i = 0; i < ct1.length; i++) {
    let t = $('<tr>')
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
    let o = $(this)
    let c1 = she.deserializeHexStrToCipherTextG1(o.text())
    let c2 = she.deserializeHexStrToCipherTextG2(o.next().text())
    let ct = she.mul(c1, c2)
    o.next().next().text(ct.serializeToHexStr())
  })
}

function sum () {
  let csum = pub.encGT(0)
  $('.encGTxyS').each(function () {
    let s = $(this).text()
    let ct = she.deserializeHexStrToCipherTextGT(s)
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
