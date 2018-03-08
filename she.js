"use strict";
(function(generator) {
  if (typeof exports === 'object') {
    generator(exports, true)
  } else {
    const exports = {}
    window.she = generator(exports, false)
  }
})(function(exports, isNodeJs) {

  const MCLBN_CURVE_FP254BNB = 0
  const MCLBN_CURVE_FP382_1 = 1
  const MCLBN_CURVE_FP382_2 = 2

  const MCLBN_FP_UNIT_SIZE = 4

  const MCLBN_FP_SIZE = MCLBN_FP_UNIT_SIZE * 8
  const MCLBN_G1_SIZE = MCLBN_FP_SIZE * 3
  const MCLBN_G2_SIZE = MCLBN_FP_SIZE * 6
  const MCLBN_GT_SIZE = MCLBN_FP_SIZE * 12

  const SHE_SECRETKEY_SIZE = MCLBN_FP_SIZE * 2
  const SHE_PUBLICKEY_SIZE = MCLBN_G1_SIZE + MCLBN_G2_SIZE
  const SHE_CIPHERTEXT_G1_SIZE = MCLBN_G1_SIZE * 2
  const SHE_CIPHERTEXT_G2_SIZE = MCLBN_G2_SIZE * 2
  const SHE_CIPHERTEXT_GT_SIZE = MCLBN_GT_SIZE * 4
  const SHE_ZKPBIN_SIZE = MCLBN_FP_SIZE * 4

  const defaultTryNum = 2048

  const setup = function(exports, curveType, range, tryNum) {
    const mod = exports.mod
    const _free = pos => {
      mod._free(pos)
    }
    const ptrToStr = function(pos, n) {
      let s = ''
        for (let i = 0; i < n; i++) {
        s += String.fromCharCode(mod.HEAP8[pos + i])
      }
      return s
    }
    const Uint8ArrayToMem = function(pos, buf) {
      for (let i = 0; i < buf.length; i++) {
        mod.HEAP8[pos + i] = buf[i]
      }
    }
    const AsciiStrToMem = function(pos, s) {
      for (let i = 0; i < s.length; i++) {
        mod.HEAP8[pos + i] = s.charCodeAt(i)
      }
    }
    const copyToUint32Array = function(a, pos) {
      a.set(mod.HEAP32.subarray(pos / 4, pos / 4 + a.length))
//    for (let i = 0; i < a.length; i++) {
//      a[i] = mod.HEAP32[pos / 4 + i]
//    }
    }
    const copyFromUint32Array = function(pos, a) {
      for (let i = 0; i < a.length; i++) {
        mod.HEAP32[pos / 4 + i] = a[i]
      }
    }
    exports.toHex = function(a, start, n) {
      let s = ''
      for (let i = 0; i < n; i++) {
        s += ('0' + a[start + i].toString(16)).slice(-2)
      }
      return s
    }
    // Uint8Array to hex string
    exports.toHexStr = function(a) {
      return exports.toHex(a, 0, a.length)
    }
    // hex string to Uint8Array
    exports.fromHexStr = function(s) {
      if (s.length & 1) throw('fromHexStr:length must be even ' + s.length)
      let n = s.length / 2
      let a = new Uint8Array(n)
      for (let i = 0; i < n; i++) {
        a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
      }
      return a
    }

    const wrap_outputString = function(func, doesReturnString = true) {
      return function(x, ioMode = 0) {
        let maxBufSize = 2048
        let pos = mod._malloc(maxBufSize)
        let n = func(pos, maxBufSize, x, ioMode)
        if (n < 0) {
          throw('err gen_str:' + x)
        }
        if (doesReturnString) {
          let s = ptrToStr(pos, n)
          _free(pos)
          return s
        } else {
          let a = new Uint8Array(n)
          for (let i = 0; i < n; i++) {
            a[i] = mod.HEAP8[pos + i]
          }
          _free(pos)
          return a
        }
      }
    }
    const wrap_outputArray = function(func) {
      return wrap_outputString(func, false)
    }
    /*
    */
    const wrap_deserialize = function(func) {
      return function(x, buf) {
        const pos = mod._malloc(buf.length)
        Uint8ArrayToMem(pos, buf)
        const r = func(x, pos, buf.length)
        _free(pos)
        if (r == 0) throw('err wrap_deserialize', buf)
      }
    }
    const callSetter = function(func, a, p1, p2) {
      let pos = mod._malloc(a.length * 4)
      func(pos, p1, p2) // p1, p2 may be undefined
      copyToUint32Array(a, pos)
      mod._free(pos)
    }
    const callGetter = function(func, a, p1, p2) {
      let pos = mod._malloc(a.length * 4)
      mod.HEAP32.set(a, pos / 4)
      let s = func(pos, p1, p2)
      mod._free(pos)
      return s
    }
    const wrap_dec = function(func) {
      return function(sec, c) {
        const pos = mod._malloc(24) // < 24 returns bat value : QQQ
        const r = func(pos, sec, c)
        _free(pos)
        if (r != 0) throw('sheDec')
        const v = mod.HEAP32[pos / 4]
        return v
      }
    }
    const callEnc = function(func, cstr, pub, m) {
      const c = new cstr()
      const cPos = c._alloc()
      const pubPos = pub._allocAndCopy()
      func(cPos, pubPos, m)
      _free(pubPos)
      c._saveAndFree(cPos)
      return c
    }
    const callEncWithZkpBin = function(func, cstr, pub, m) {
      let c = new cstr()
      let cPos = mod._malloc(c.a_.length * 4)
      let pubPos = mod._malloc(pub.length * 4)
      let zkp = new exports.ZkpBin()
      let zkpPos = mod._malloc(zkp.a_.length * 4)
      copyFromUint32Array(pubPos, pub);
      const r = func(cPos, zkpPos, pubPos, m)
      copyToUint32Array(c.a_, cPos)
      copyToUint32Array(zkp.a_, zkpPos)
      _free(zkpPos)
      _free(pubPos)
      _free(cPos)
      if (r) throw('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    const callPPKEncWithZkpBin = function(func, cstr, pubPos, m) {
      let c = new cstr()
      let cPos = mod._malloc(c.a_.length * 4)
      let zkp = new exports.ZkpBin()
      let zkpPos = mod._malloc(zkp.a_.length * 4)
      const r = func(cPos, zkpPos, pubPos, m)
      copyToUint32Array(c.a_, cPos)
      copyToUint32Array(zkp.a_, zkpPos)
      _free(zkpPos)
      _free(cPos)
      if (r) throw('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    const callPPKEnc = function(func, cstr, ppub, m) {
      let c = new cstr()
      let cPos = mod._malloc(c.a_.length * 4)
      func(cPos, ppub, m)
      copyToUint32Array(c.a_, cPos)
      _free(cPos)
      return c
    }
    // return func(x, y)
    const callAddSub = function(func, cstr, x, y) {
      let z = new cstr()
      let xPos = mod._malloc(x.length * 4)
      let yPos = mod._malloc(y.length * 4)
      let zPos = mod._malloc(z.a_.length * 4)
      copyFromUint32Array(xPos, x);
      copyFromUint32Array(yPos, y);
      func(zPos, xPos, yPos)
      copyToUint32Array(z.a_, zPos)
      _free(zPos)
      _free(yPos)
      _free(xPos)
      return z
    }
    // return func(x, y)
    const callMulInt = function(func, cstr, x, y) {
      let z = new cstr()
      let xPos = mod._malloc(x.length * 4)
      let zPos = mod._malloc(z.a_.length * 4)
      copyFromUint32Array(xPos, x);
      func(zPos, xPos, y)
      copyToUint32Array(z.a_, zPos)
      _free(zPos)
      _free(xPos)
      return z
    }
    // return func((G1)x, (G2)y)
    const callMul = function(func, x, y) {
      if (!exports.CipherTextG1.prototype.isPrototypeOf(x)
        || !exports.CipherTextG2.prototype.isPrototypeOf(y)) throw('exports.mul:bad type')
      let z = new exports.CipherTextGT()
      let xPos = mod._malloc(x.a_.length * 4)
      let yPos = mod._malloc(y.a_.length * 4)
      let zPos = mod._malloc(z.a_.length * 4)
      copyFromUint32Array(xPos, x.a_)
      copyFromUint32Array(yPos, y.a_)
      func(zPos, xPos, yPos)
      copyToUint32Array(z.a_, zPos)
      _free(zPos)
      _free(yPos)
      _free(xPos)
      return z
    }
    // return func(c)
    const callDec = function(func, sec, c) {
      const secPos = sec._allocAndCopy()
      const cPos = c._allocAndCopy()
      const r = func(secPos, cPos)
      _free(cPos)
      _free(secPos)
      return r
    }
    const callIsZero = function(func, sec, c) {
      let secPos = mod._malloc(sec.length * 4)
      let cPos = mod._malloc(c.length * 4)
      copyFromUint32Array(secPos, sec);
      copyFromUint32Array(cPos, c);
      let r = func(secPos, cPos)
      _free(cPos)
      _free(secPos)
      return r
    }
    const callVerify = function(func, pub, c, zkp) {
      let pubPos = mod._malloc(pub.length * 4)
      let cPos = mod._malloc(c.length * 4)
      let zkpPos = mod._malloc(zkp.length * 4)
      copyFromUint32Array(pubPos, pub)
      copyFromUint32Array(cPos, c)
      copyFromUint32Array(zkpPos, zkp)
      const r = func(pubPos, cPos, zkpPos)
      _free(zkpPos)
      _free(cPos)
      _free(pubPos)
      return r == 1
    }
    const callPPKVerify = function(func, pubPos, c, zkp) {
      let cPos = mod._malloc(c.length * 4)
      let zkpPos = mod._malloc(zkp.length * 4)
      copyFromUint32Array(cPos, c)
      copyFromUint32Array(zkpPos, zkp)
      const r = func(pubPos, cPos, zkpPos)
      _free(zkpPos)
      _free(cPos)
      return r == 1
    }
    // reRand(c)
    const callReRand = function(func, c, pub) {
      let cPos = mod._malloc(c.length * 4)
      let pubPos = mod._malloc(pub.length * 4)
      copyFromUint32Array(cPos, c);
      copyFromUint32Array(pubPos, pub);
      let r = func(cPos, pubPos)
      copyToUint32Array(c, cPos)
      _free(pubPos)
      _free(cPos)
      if (r) throw('callReRand err')
    }
    // convert
    const callConvert = function(func, pub, c) {
      let ct = new exports.CipherTextGT()
      let ctPos = mod._malloc(ct.a_.length * 4)
      let pubPos = mod._malloc(pub.length * 4)
      let cPos = mod._malloc(c.length * 4)
      copyFromUint32Array(pubPos, pub);
      copyFromUint32Array(cPos, c);
      let r = func(ctPos, pubPos, cPos)
      copyToUint32Array(ct.a_, ctPos)
      _free(ctPos)
      _free(pubPos)
      _free(ctPos)
      if (r) throw('callConvert err')
      return ct
    }
    const callLoadTable = (func, a) => {
      const p = mod._malloc(a.length)
      for (let i = 0; i < a.length; i++) {
        mod.HEAP8[p + i] = a[i]
      }
      const n = func(p, a.length)
      if (n == 0) throw('callLoadTable err')
    }

    mod.sheSecretKeySerialize = wrap_outputArray(mod._sheSecretKeySerialize)
    mod.sheSecretKeyDeserialize = wrap_deserialize(mod._sheSecretKeyDeserialize)
    mod.shePublicKeySerialize = wrap_outputArray(mod._shePublicKeySerialize)
    mod.shePublicKeyDeserialize = wrap_deserialize(mod._shePublicKeyDeserialize)
    mod.sheCipherTextG1Serialize = wrap_outputArray(mod._sheCipherTextG1Serialize)
    mod.sheCipherTextG1Deserialize = wrap_deserialize(mod._sheCipherTextG1Deserialize)
    mod.sheDecG1 = wrap_dec(mod._sheDecG1)
    mod.sheDecG1ViaGT = wrap_dec(mod._sheDecG1ViaGT)
    mod.sheCipherTextG2Serialize = wrap_outputArray(mod._sheCipherTextG2Serialize)
    mod.sheCipherTextG2Deserialize = wrap_deserialize(mod._sheCipherTextG2Deserialize)
    mod.sheDecG2 = wrap_dec(mod._sheDecG2)
    mod.sheDecG2ViaGT = wrap_dec(mod._sheDecG2ViaGT)
    mod.sheCipherTextGTSerialize = wrap_outputArray(mod._sheCipherTextGTSerialize)
    mod.sheCipherTextGTDeserialize = wrap_deserialize(mod._sheCipherTextGTDeserialize)
    mod.sheDecGT = wrap_dec(mod._sheDecGT)
    mod.sheZkpBinSerialize = wrap_outputArray(mod._sheZkpBinSerialize)
    mod.sheZkpBinDeserialize = wrap_deserialize(mod._sheZkpBinDeserialize)

    class Common {
      constructor(size) {
        this.a_ = new Uint32Array(size / 4)
      }
      deserializeHexStr(s) {
        this.deserialize(exports.fromHexStr(s))
      }
      serializeToHexStr() {
        return exports.toHexStr(this.serialize())
      }
      dump(msg = '') {
        console.log(msg + this.serializeToHexStr())
      }
      clear () {
        this.a_.fill(0)
      }
      // alloc new array
      _alloc () {
        return mod._malloc(this.a_.length * 4)
      }
      // alloc and copy a_ to mod.HEAP32[pos / 4]
      _allocAndCopy () {
        const pos = this._alloc()
        mod.HEAP32.set(this.a_, pos / 4)
        return pos
      }
      // save pos to a_
      _save (pos) {
        this.a_.set(mod.HEAP32.subarray(pos / 4, pos / 4 + this.a_.length))
      }
      // save and free
      _saveAndFree(pos) {
        this._save(pos)
        _free(pos)
      }
      // set parameter (p1, p2 may be undefined)
      _setter (func, p1, p2) {
        const pos = this._alloc()
        const r = func(pos, p1, p2)
        this._saveAndFree(pos)
        if (r) throw new Error('_setter err')
      }
      // getter (p1, p2 may be undefined)
      _getter (func, p1, p2) {
        const pos = this._allocAndCopy()
        const s = func(pos, p1, p2)
        _free(pos)
        return s
      }
      _isEqual (func, rhs) {
        const xPos = this._allocAndCopy()
        const yPos = rhs._allocAndCopy()
        const r = func(xPos, yPos)
        _free(yPos)
        _free(xPos)
        return r === 1
      }
      // func(y, this) and return y
      _op1 (func) {
        const y = new this.constructor()
        const xPos = this._allocAndCopy()
        const yPos = y._alloc()
        func(yPos, xPos)
        y._saveAndFree(yPos)
        _free(xPos)
        return y
      }
      // func(z, this, y) and return z
      _op2 (func, y, Cstr = null) {
        const z = Cstr ? new Cstr() : new this.constructor()
        const xPos = this._allocAndCopy()
        const yPos = y._allocAndCopy()
        const zPos = z._alloc()
        func(zPos, xPos, yPos)
        z._saveAndFree(zPos)
        _free(yPos)
        _free(xPos)
        return z
      }
    }
    exports.SecretKey = class extends Common {
      constructor() {
        super(SHE_SECRETKEY_SIZE)
      }
      serialize() {
        return callGetter(mod.sheSecretKeySerialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.sheSecretKeyDeserialize, this.a_, s)
      }
      setByCSPRNG() {
        let secPos = mod._malloc(this.a_.length * 4)
        mod._sheSecretKeySetByCSPRNG(secPos)
        copyToUint32Array(this.a_, secPos)
        _free(secPos)
      }
      getPublicKey() {
        let pub = new exports.PublicKey()
        let secPos = mod._malloc(this.a_.length * 4)
        let pubPos = mod._malloc(pub.a_.length * 4)
        copyFromUint32Array(secPos, this.a_)
        mod._sheGetPublicKey(pubPos, secPos)
        copyToUint32Array(pub.a_, pubPos)
        _free(pubPos)
        _free(secPos)
        return pub
      }
      dec(c) {
        let dec = null
        if (c instanceof exports.CipherTextG1) {
          dec = mod.sheDecG1
        } else if (c instanceof exports.CipherTextG2) {
          dec = mod.sheDecG2
        } else if (c instanceof exports.CipherTextGT) {
          dec = mod.sheDecGT
        } else {
          throw('exports.SecretKey.dec:not supported')
        }
        return callDec(dec, this, c)
      }
      decViaGT(c) {
        let dec = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          dec = mod.sheDecG1ViaGT
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          dec = mod.sheDecG2ViaGT
        } else {
          throw('exports.SecretKey.decViaGT:not supported')
        }
        return callDec(dec, this, c)
      }
      isZero(c) {
        let isZero = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroG2
        } else if (exports.CipherTextGT.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroGT
        } else {
          throw('exports.SecretKey.isZero:not supported')
        }
        return callIsZero(isZero, this.a_, c.a_)
      }
    }

    exports.deserializeHexStrToSecretKey = function(s) {
      r = new exports.SecretKey()
      r.deserializeHexStr(s)
      return r
    }
    exports.PrecomputedPublicKey = class {
      constructor() {
        this.p = mod._shePrecomputedPublicKeyCreate()
      }
      /*
        call destroy if PrecomputedPublicKey is not necessary
        to avoid memory leak
      */
      destroy() {
        if (this.p == null) return
        mod._shePrecomputedPublicKeyDestroy(this.p)
        this.p = null
      }
      /*
        initialize PrecomputedPublicKey by PublicKey pub
      */
      init(pub) {
        const pubPos = mod._malloc(pub.a_.length * 4)
        copyFromUint32Array(pubPos, pub.a_)
        mod._shePrecomputedPublicKeyInit(this.p, pubPos)
        _free(pubPos)
      }
      encG1(m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncG1, exports.CipherTextG1, this.p, m)
      }
      encG2(m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncG2, exports.CipherTextG2, this.p, m)
      }
      encGT(m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncGT, exports.CipherTextGT, this.p, m)
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1(m) {
        return callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG1, exports.CipherTextG1, this.p, m)
      }
      encWithZkpBinG2(m) {
        return callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG2, exports.CipherTextG2, this.p, m)
      }
      verify(c, zkp) {
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          return callPPKVerify(mod._shePrecomputedPublicKeyVerifyZkpBinG1, this.p, c.a_, zkp.a_)
        }
        if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          return callPPKVerify(mod._shePrecomputedPublicKeyVerifyZkpBinG2, this.p, c.a_, zkp.a_)
        }
        throw('exports.verify:bad type')
      }
    }
    exports.PublicKey = class extends Common {
      constructor() {
        super(SHE_PUBLICKEY_SIZE)
      }
      serialize() {
        return callGetter(mod.shePublicKeySerialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.shePublicKeyDeserialize, this.a_, s)
      }
      encG1(m) {
        return callEnc(mod._sheEncG1, exports.CipherTextG1, this, m)
      }
      encG2(m) {
        return callEnc(mod._sheEncG2, exports.CipherTextG2, this, m)
      }
      encGT(m) {
        return callEnc(mod._sheEncGT, exports.CipherTextGT, this, m)
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1(m) {
        return callEncWithZkpBin(mod._sheEncWithZkpBinG1, exports.CipherTextG1, this.a_, m)
      }
      encWithZkpBinG2(m) {
        return callEncWithZkpBin(mod._sheEncWithZkpBinG2, exports.CipherTextG2, this.a_, m)
      }
      verify(c, zkp) {
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          return callVerify(mod._sheVerifyZkpBinG1, this.a_, c.a_, zkp.a_)
        }
        if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          return callVerify(mod._sheVerifyZkpBinG2, this.a_, c.a_, zkp.a_)
        }
        throw('exports.verify:bad type')
      }
      reRand(c) {
        let reRand = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          reRand = mod._sheReRandG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          reRand = mod._sheReRandG2
        } else if (exports.CipherTextGT.prototype.isPrototypeOf(c)) {
          reRand = mod._sheReRandGT
        } else {
          throw('exports.PublicKey.reRand:not supported')
        }
        return callReRand(reRand, c.a_, this.a_)
      }
      // convert to CipherTextGT
      convert(c) {
        let convert = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          convert = mod._sheConvertG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          convert = mod._sheConvertG2
        } else {
          throw('exports.PublicKey.convert:not supported')
        }
        return callConvert(convert, this.a_, c.a_)
      }
    }

    exports.deserializeHexStrToPublicKey = function(s) {
      r = new exports.PublicKey()
      r.deserializeHexStr(s)
      return r
    }
    exports.CipherTextG1 = class extends Common {
      constructor() {
        super(SHE_CIPHERTEXT_G1_SIZE)
      }
      serialize() {
        return callGetter(mod.sheCipherTextG1Serialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.sheCipherTextG1Deserialize, this.a_, s)
      }
    }

    exports.deserializeHexStrToCipherTextG1 = function(s) {
      r = new exports.CipherTextG1()
      r.deserializeHexStr(s)
      return r
    }
    exports.CipherTextG2 = class extends Common {
      constructor() {
        super(SHE_CIPHERTEXT_G2_SIZE)
      }
      serialize() {
        return callGetter(mod.sheCipherTextG2Serialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.sheCipherTextG2Deserialize, this.a_, s)
      }
    }

    exports.deserializeHexStrToCipherTextG2 = function(s) {
      r = new exports.CipherTextG2()
      r.deserializeHexStr(s)
      return r
    }

    exports.CipherTextGT = class extends Common {
      constructor() {
        super(SHE_CIPHERTEXT_GT_SIZE)
      }
      serialize() {
        return callGetter(mod.sheCipherTextGTSerialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.sheCipherTextGTDeserialize, this.a_, s)
      }
    }

    exports.ZkpBin = class extends Common {
      constructor() {
        super(SHE_ZKPBIN_SIZE)
      }
      serialize() {
        return callGetter(mod.sheZkpBinSerialize, this.a_)
      }
      deserialize(s) {
        callSetter(mod.sheZkpBinDeserialize, this.a_, s)
      }
    }

    exports.deserializeHexStrToCipherTextGT = function(s) {
      r = new exports.CipherTextGT()
      r.deserializeHexStr(s)
      return r
    }
    // return x + y
    exports.add = function(x, y) {
      if  (x.a_.length != y.a_.length) throw('exports.add:bad type')
      let add = null
      let cstr = null
      if (exports.CipherTextG1.prototype.isPrototypeOf(x)) {
        add = mod._sheAddG1
        cstr = exports.CipherTextG1
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(x)) {
        add = mod._sheAddG2
        cstr = exports.CipherTextG2
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(x)) {
        add = mod._sheAddGT
        cstr = exports.CipherTextGT
      } else {
        throw('exports.add:not supported')
      }
      return callAddSub(add, cstr, x.a_, y.a_)
    }
    // return x - y
    exports.sub = function(x, y) {
      if  (x.a_.length != y.a_.length) throw('exports.sub:bad type')
      let sub = null
      let cstr = null
      if (exports.CipherTextG1.prototype.isPrototypeOf(x)) {
        sub = mod._sheSubG1
        cstr = exports.CipherTextG1
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(x)) {
        sub = mod._sheSubG2
        cstr = exports.CipherTextG2
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(x)) {
        sub = mod._sheSubGT
        cstr = exports.CipherTextGT
      } else {
        throw('exports.sub:not supported')
      }
      return callAddSub(sub, cstr, x.a_, y.a_)
    }
    // return x * (int)y
    exports.mulInt = function(x, y) {
      let mulInt = null
      let cstr = null
      if (exports.CipherTextG1.prototype.isPrototypeOf(x)) {
        mulInt = mod._sheMulG1
        cstr = exports.CipherTextG1
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(x)) {
        mulInt = mod._sheMulG2
        cstr = exports.CipherTextG2
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(x)) {
        mulInt = mod._sheMulGT
        cstr = exports.CipherTextGT
      } else {
        throw('exports.mulInt:not supported')
      }
      return callMulInt(mulInt, cstr, x.a_, y)
    }
    // return (G1)x * (G2)y
    exports.mul = function(x, y) {
      return callMul(mod._sheMul, x, y)
    }
    exports.mulML = function(x, y) {
      return callMul(mod._sheMulML, x, y)
    }
    exports.finalExpGT = function(x) {
      const y = new exports.CipherTextGT()
      const xPos = mod._malloc(x.a_.length * 4)
      const yPos = mod._malloc(y.a_.length * 4)
      copyFromUint32Array(xPos, x.a_);
      mod._sheFinalExpGT(yPos, xPos)
      copyToUint32Array(y.a_, yPos)
      _free(yPos)
      _free(xPos)
      return y
    }
    exports.loadTableForG1DLP = (a) => {
      callLoadTable(mod._sheLoadTableForG1DLP, a)
    }
    exports.loadTableForG2DLP = (a) => {
      callLoadTable(mod._sheLoadTableForG2DLP, a)
    }
    exports.loadTableForGTDLP = (a) => {
      callLoadTable(mod._sheLoadTableForGTDLP, a)
    }
    exports.setTryNum = (tryNum) => {
      mod._sheSetTryNum(tryNum)
    }
    exports.useDecG1ViaGT = (use = 1) => {
      mod._sheUseDecG1ViaGT(use)
    }
    exports.useDecG2ViaGT = (use = 1) => {
      mod._sheUseDecG2ViaGT(use)
    }
    let r = mod._sheInit(curveType, MCLBN_FP_UNIT_SIZE)
    if (r) throw('_sheInit err')
    console.log(`initializing sheSetRangeForDLP(range=${range}, tryNum=${tryNum})`)
    r = mod._sheSetRangeForDLP(range)
    if (r) throw('_sheSetRangeForDLP err')
    mod._sheSetTryNum(tryNum)
    console.log('finished')
  } // setup()
  /*
    init she
    @param range [in] table size of DLP ; require 8 * table size
    @param tryNum [in] how many search ; O(tryNum) time
    can decrypt (range * tryNum) range value
  */
  exports.init = (range = 1024, tryNum = defaultTryNum) => {
    const curveType = MCLBN_CURVE_FP254BNB
    console.log('init')
    const name = 'she_c'
    return new Promise((resolve) => {
      if (isNodeJs) {
        const js = require(`./${name}.js`)
        const Module = {
          wasmBinaryFile : __dirname + `/${name}.wasm`
        }
        js(Module)
          .then(_mod => {
            exports.mod = _mod
            setup(exports, curveType, range, tryNum)
            resolve()
          })
      } else {
        fetch(`./${name}.wasm`)
          .then(response => response.arrayBuffer())
          .then(buffer => new Uint8Array(buffer))
          .then(() => {
            exports.mod = Module()
            exports.mod.onRuntimeInitialized = () => {
              setup(exports, curveType, range, tryNum)
              resolve()
            }
          })
      }
    })
  }
  return exports
})
