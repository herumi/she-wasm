const she = require('./index.js')

she.init(() => {
	let sec = new she.SecretKey()
	sec.setByCSPRNG()
	sec.dump('sec ')
	let pub = sec.getPublicKey()
	pub.dump('pub ')
	let m1 = 9
	let m2 = 5
	let c1 = pub.encG1(m1)
	let c2 = pub.encG2(m2)
	let ct = she.mul(c1, c2)
	console.log('dec ' + sec.dec(ct))
})

