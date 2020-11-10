'use strict'
const she = require('../she')
const { performance } = require('perf_hooks')

const curveTest = (curveType, name) => {
	describe(`curveType ${name}`, () => {
		beforeAll(async () => {
			await she.init(curveType)
		})
		minimumTest()
		zkpDecTest()
		encDecTest()
		serializeTest()
		rerandTest()
		convertTest()
		ppubTest()
		finalExpTest()
		loadTableTest()
		zkpBinTest()
		mulIntTest()
		benchmark()
	})
}

function minimumTest() {
	it('should handle basic operations', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m1 = 9
		const m2 = 5
		const m3 = 2
		const m4 = -1
		const c11 = pub.encG1(m1)
		expect(sec.dec(c11)).toEqual(m1)
		const c12 = pub.encG1(m2)
		const c21 = pub.encG2(m3)
		expect(sec.dec(c21)).toEqual(m3)
		const c22 = pub.encG2(m4)
		const c1 = she.add(c11, c12)
		const c2 = she.add(c21, c22)
		const ct = she.mul(c1, c2)
		expect(sec.dec(ct)).toEqual((m1 + m2) * (m3 + m4))
	})
}

function encDecTest() {
	it('should handle enc and dec', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		for (let m = -3; m < 3; m++) {
			const c1 = pub.encG1(m)
			expect(sec.dec(c1)).toEqual(m)
			expect(sec.decViaGT(c1)).toEqual(m)
			expect(sec.isZero(c1)).toEqual(m === 0)
			const n1 = she.neg(c1)
			expect(sec.dec(n1)).toEqual(m === 0 ? 0 : -m)
			const c2 = pub.encG2(m)
			expect(sec.dec(c2)).toEqual(m)
			expect(sec.decViaGT(c2)).toEqual(m)
			expect(sec.isZero(c2)).toEqual(m === 0)
			const n2 = she.neg(c2)
			expect(sec.dec(n2)).toEqual(m === 0 ? 0 : -m)
			const ct = pub.encGT(m)
			expect(sec.dec(ct)).toEqual(m)
			expect(sec.isZero(ct)).toEqual(m === 0)
			const nt = she.neg(ct)
			expect(sec.dec(nt)).toEqual(m === 0 ? 0 : -m)
		}
	})
}

function serializeSubTest(t, Cstr) {
	const s = t.serializeToHexStr()
	const t2 = new Cstr()
	t2.deserializeHexStr(s)
	expect(t.serialize()).toEqual(t2.serialize())
}

function serializeTest() {
	it('should serialize', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		serializeSubTest(sec, she.SecretKey)
		serializeSubTest(pub, she.PublicKey)
		const m = 123
		const c1 = pub.encG1(m)
		serializeSubTest(c1, she.CipherTextG1)
		const c2 = pub.encG2(m)
		serializeSubTest(c2, she.CipherTextG2)
		const ct = pub.encGT(m)
		serializeSubTest(ct, she.CipherTextGT)
	})
}

function rerandSubTest(c, sec, pub, m) {
	const s1 = c.serializeToHexStr()
	pub.reRand(c)
	const s2 = c.serializeToHexStr()
	expect(s1).not.toEqual(s2)
	expect(sec.dec(c)).toEqual(m)
}

function rerandTest() {
	it('should re rand ', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()

		const m = 987
		rerandSubTest(pub.encG1(m), sec, pub, m)
		rerandSubTest(pub.encG2(m), sec, pub, m)
		rerandSubTest(pub.encGT(m), sec, pub, m)
	})
}

function convertTest() {
	it('should convert', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m = 987
		expect(sec.dec(pub.convert(pub.encG1(m)))).toEqual(m)
		expect(sec.dec(pub.convert(pub.encG2(m)))).toEqual(m)
	})
}

function bench(label, count, func) {
	const start = performance.now()
	for (let i = 0; i < count; i++) {
		func()
	}
	const end = performance.now()
	const t = (end - start) / count
	const roundTime = Math.round(t * 1000) / 1000
}

function ppubTest() {
	it('should handle precomputed public key', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const ppub = new she.PrecomputedPublicKey()
		ppub.init(pub)
		const m = 1234
		const c1 = ppub.encG1(m)
		expect(sec.dec(c1)).toEqual(m)
		const c2 = ppub.encG2(m)
		expect(sec.dec(c2)).toEqual(m)
		const ct = ppub.encGT(m)
		expect(sec.dec(ct)).toEqual(m)

		bench('PPKencG1', 100, () => ppub.encG1(m))
		bench('PPKencG2', 100, () => ppub.encG2(m))
		bench('PPKencGT', 100, () => ppub.encGT(m))

		ppub.destroy()
	})
}

function finalExpTest() {
	it('should handle final exp', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m11 = 5
		const m12 = 7
		const m21 = -3
		const m22 = 9
		const c11 = pub.encG1(m11)
		const c12 = pub.encG1(m12)
		const c21 = pub.encG2(m21)
		const c22 = pub.encG2(m22)

		let ct = she.mul(c11, c21)
		expect(sec.dec(ct)).toEqual(m11 * m21)

		const ct1 = she.mulML(c11, c21)
		ct = she.finalExpGT(ct1)
		expect(sec.dec(ct)).toEqual(m11 * m21)

		const ct2 = she.mulML(c12, c22)
		ct = she.add(ct1, ct2)
		ct = she.finalExpGT(ct)
		expect(sec.dec(ct)).toEqual(m11 * m21 + m12 * m22)
	})
}

function loadTableTest() {
	it('should load table', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const fs = require('fs')
		const DLPtable = 'she-dlp-0-20-gt.bin'
		try {
			if (she.curveType !== she.BN254) return
			she.loadTableForGTDLP(fs.readFileSync(DLPtable))
		} catch (e) {
			console.log(`${e} is not found`)
			console.log(
				`curl -O https://herumi.github.io/she-dlp-table/${DLPtable}`,
			)
			return
		}
		{
			const m = 0x7fffffff
			const ct = pub.encGT(m)
			expect(sec.dec(ct)).toEqual(m)
			bench('decGT', 10, () => sec.dec(ct))
		}
		{
			const m = -0x7fffffff - 1
			const ct = pub.encGT(m)
			expect(sec.dec(ct)).toEqual(m)
		}
	})
}

function zkpBinTestSub(sec, pub, encWithZkpBin) {
	for (let m = 0; m < 2; m++) {
		const [c, zkp] = pub[encWithZkpBin](m)
		expect(sec.dec(c)).toEqual(m)
		expect(pub.verify(c, zkp)).toBeTruthy()
		serializeSubTest(zkp, she.ZkpBin)
		zkp.a_[0]++
		expect(pub.verify(c, zkp)).toBeFalsy()
	}
	try {
		pub[encWithZkpBin](2)
		fail()
	} catch (e) {
		expect(e).toBeDefined()
	}
}

function zkpBinTestEqSub(sec, pub, encWithZkpBin) {
	for (let m = 0; m < 2; m++) {
		const [c1, c2, zkp] = pub[encWithZkpBin](m)
		expect(sec.dec(c1)).toEqual(m)
		expect(sec.dec(c2)).toEqual(m)
		expect(pub.verifyEq(c1, c2, zkp)).toBeTruthy()
		const [c3, c4] = pub[encWithZkpBin](m)
		expect(pub.verifyEq(c3, c4, zkp)).toBeFalsy()
	}
	try {
		pub[encWithZkpBin](2)
		fail()
	} catch (e) {
		expect(e).toBeDefined()
	}
}

function zkpBinTest() {
	it('should handle zkp bin', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		zkpBinTestSub(sec, pub, 'encWithZkpBinG1')
		zkpBinTestSub(sec, pub, 'encWithZkpBinG2')

		const ppub = new she.PrecomputedPublicKey()
		ppub.init(pub)
		zkpBinTestSub(sec, ppub, 'encWithZkpBinG1')
		zkpBinTestSub(sec, ppub, 'encWithZkpBinG2')
		ppub.destroy()
	})

	it('should handle zkp bin eq', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		zkpBinTestEqSub(sec, pub, 'encWithZkpBinEq')
	})
}

function zkpDecTest() {
	it('should handle zkp dec', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m = 123
		const c = pub.encG1(m)
		const [dec, zkp] = sec.decWithZkpDec(c, pub)
		expect(dec).toEqual(m)
		expect(pub.verify(c, zkp, m)).toBeTruthy()
		expect(pub.verify(c, zkp, m + 1)).toBeFalsy()

		const c1 = pub.encG1(m)
		expect(pub.verify(c1, zkp, m)).toBeFalsy()
		zkp.a_[0]++
		expect(pub.verify(c, zkp, m)).toBeFalsy()
	})
}

function mulIntTest() {
	it('should handle mul int', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m1 = 13
		const m2 = 24
		const c1 = she.mulInt(pub.encG1(m1), m2)
		const c2 = she.mulInt(pub.encG2(m1), m2)
		const ct = she.mulInt(pub.encGT(m1), m2)
		expect(sec.dec(c1)).toEqual(m1 * m2)
		expect(sec.dec(c2)).toEqual(m1 * m2)
		expect(sec.dec(ct)).toEqual(m1 * m2)
	})
}

function benchmark() {
	it('should benchmark', () => {
		const sec = new she.SecretKey()
		sec.setByCSPRNG()
		const pub = sec.getPublicKey()
		const m = 1234
		const C = 100
		bench('encG1', C, () => pub.encG1(m))
		bench('encG2', C, () => pub.encG2(m))
		bench('encGT', C, () => pub.encGT(m))
		const c1 = pub.encG1(m)
		const c2 = pub.encG2(m)
		const ct = pub.encGT(m)
		bench('decG1', C, () => sec.dec(c1))
		bench('decG2', C, () => sec.dec(c2))
		bench('decGT', C, () => sec.dec(ct))
		bench('addG1', C, () => she.add(c1, c1))
		bench('addG2', C, () => she.add(c2, c2))
		bench('addGT', C, () => she.add(ct, ct))
		bench('mul', C, () => she.mul(c1, c2))
		bench('mulML', C, () => she.mulML(c1, c2))
		bench('finalExp', C, () => she.finalExpGT(ct))
	})
}

module.exports = { curveTest }
