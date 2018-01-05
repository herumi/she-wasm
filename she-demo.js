function getValue(name) { return document.getElementsByName(name)[0].value }
function setValue(name, val) { document.getElementsByName(name)[0].value = val }
function getText(name) { return document.getElementsByName(name)[0].innerText }
function setText(name, val) { document.getElementsByName(name)[0].innerText = val }

let sec = null
let pub = null

she.init()
  .then(() => {
    fetch('https://herumi.github.io/she-dlp-table/she-dlp-0-20-gt.bin')
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const a = new Uint8Array(buffer)
        she.loadTableForGTDLP(a)
        console.log('load Table done')
        setText('status', 'ok')
        sec = new she.SecretKey()
        sec.setByCSPRNG()
        sec.dump('sec=')
        pub = sec.getPublicKey()
        pub.dump('pub=')
      })
  })

function append() {
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

function send() {
	let ct1 = []
	$('.encG1x').each(function() {
		ct1.push($(this).text())
	})
	let ct2 = []
	$('.encG2y').each(function() {
		ct2.push($(this).text())
	})
	let obj = $('#server_table')
	obj.html('')
	{
		let header = [
			'EncG1(x)', 'EncG2(y)', 'EncGT(x * y)'
		]
		let t = $('<tr>').attr('id', 'header')
		for (let i = 0; i < header.length; i++) {
			t.append(
				$('<th>').append(header[i])
			)
		}
		obj.append(t)
	}
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

function mul() {
	$('.encG1xS').each(function() {
		let o = $(this)
		let c1 = she.deserializeHexStrToCipherTextG1(o.text())
		let c2 = she.deserializeHexStrToCipherTextG2(o.next().text())
		let ct = she.mul(c1, c2)
		o.next().next().text(ct.serializeToHexStr())
	})
}

function sum() {
	let csum = pub.encGT(0)
	$('.encGTxyS').each(function() {
		let s = $(this).text()
		let ct = she.deserializeHexStrToCipherTextGT(s)
		csum = she.add(csum, ct)
	})
	setText('encSumS', csum.serializeToHexStr())
}

function recv() {
	setText('encSumC', getText('encSumS'))
}

function dec() {
	let s = getText('encSumC')
	let ct = she.deserializeHexStrToCipherTextGT(s)
	let v = sec.dec(ct)
	setText('ret', v)
}
