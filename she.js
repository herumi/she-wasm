'use strict';
(generator => {
  if (typeof exports === 'object') {
    // necessary to use /dev/urandom
    const crypto = require('crypto')
    crypto.getRandomValues = crypto.randomFillSync
    generator(exports, true)
  } else {
    const exports = {}
    window.she = generator(exports, false)
  }
})((exports, isNodeJs) => {
  /* eslint-disable */
  exports.BN254 = 0
  exports.BN382_1 = 1
  exports.BN382_2 = 2
  exports.BN462 = 3
  exports.BN_SNARK1 = 4
  exports.BLS12_381 = 5
  /* eslint-disable */
  const getUnitSize = curveType => {
    switch (curveType) {
    case exports.BN254:
    case exports.BN_SNARK1:
      return 4; /* use mcl_c.js */
    default:
      throw new Error(`QQQ bad curveType=${curveType}`)
    }
  }

  const defaultTryNum = 2048

  const setup = (exports, curveType, range, tryNum) => {
    const mod = exports.mod
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

    const _free = pos => {
      mod._free(pos)
    }
    const ptrToAsciiStr = (pos, n) => {
      let s = ''
      for (let i = 0; i < n; i++) {
        s += String.fromCharCode(mod.HEAP8[pos + i])
      }
      return s
    }
    const asciiStrToPtr = (pos, s) => {
      for (let i = 0; i < s.length; i++) {
        mod.HEAP8[pos + i] = s.charCodeAt(i)
      }
    }
    exports.toHex = (a, start, n) => {
      let s = ''
      for (let i = 0; i < n; i++) {
        s += ('0' + a[start + i].toString(16)).slice(-2)
      }
      return s
    }
    // Uint8Array to hex string
    exports.toHexStr = a => {
      return exports.toHex(a, 0, a.length)
    }
    // hex string to Uint8Array
    exports.fromHexStr = s => {
      if (s.length & 1) throw new Error('fromHexStr:length must be even ' + s.length)
      const n = s.length / 2
      const a = new Uint8Array(n)
      for (let i = 0; i < n; i++) {
        a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
      }
      return a
    }

    const _wrapGetStr = (func, returnAsStr = true) => {
      return (x, ioMode = 0) => {
        const maxBufSize = 2048
        const pos = mod._malloc(maxBufSize)
        const n = func(pos, maxBufSize, x, ioMode)
        if (n < 0) {
          throw new Error('err gen_str:' + x)
        }
        let s = null
        if (returnAsStr) {
          s = ptrToAsciiStr(pos, n)
        } else {
          s = new Uint8Array(mod.HEAP8.subarray(pos, pos + n))
        }
        _free(pos)
        return s
      }
    }
    const _wrapSerialize = func => {
      return _wrapGetStr(func, false)
    }
    const _wrapDeserialize = func => {
      return (x, buf) => {
        const pos = mod._malloc(buf.length)
        mod.HEAP8.set(buf, pos)
        const r = func(x, pos, buf.length)
        _free(pos)
        if (r === 0) throw new Error('err _wrapDeserialize', buf)
      }
    }
    exports.free = x => {
      mod._free(x)
    }
    const wrap_dec = func => {
      return function (sec, c) {
        const pos = mod._malloc(24) // < 24 returns bat value : QQQ
        const r = func(pos, sec, c)
        _free(pos)
        if (r != 0) throw ('sheDec')
        return mod.HEAP32[pos / 4]
      }
    }
    const callEnc = (func, cstr, pub, m) => {
      const c = new cstr()
      const cPos = c._alloc()
      const pubPos = pub._allocAndCopy()
      func(cPos, pubPos, m)
      _free(pubPos)
      c._saveAndFree(cPos)
      return c
    }
    const callPPKEncWithZkpBin = (func, cstr, pubPos, m) => {
      const c = new cstr()
      const cPos = c._alloc()
      const zkp = new exports.ZkpBin()
      const zkpPos = zkp._alloc()
      const r = func(cPos, zkpPos, pubPos, m)
      zkp._saveAndFree(zkpPos)
      c._saveAndFree(cPos)
      if (r) throw ('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    const callEncWithZkpBin = (func, cstr, pub, m) => {
      const pubPos = pub._allocAndCopy()
      const r = callPPKEncWithZkpBin(func, cstr, pubPos, m)
      _free(pubPos)
      return r
    }
    const callPPKEnc = (func, cstr, ppub, m) => {
      const c = new cstr()
      const cPos = c._alloc()
      func(cPos, ppub, m)
      c._saveAndFree(cPos)
      return c
    }
    // return func(x, y)
    const callAddSub = (func, cstr, x, y) => {
      const z = new cstr()
      const xPos = x._allocAndCopy()
      const yPos = y._allocAndCopy()
      const zPos = z._alloc()
      func(zPos, xPos, yPos)
      z._saveAndFree(zPos)
      _free(yPos)
      _free(xPos)
      return z
    }
    // return func((G1)x, (G2)y)
    const callMul = (func, x, y) => {
      if (!exports.CipherTextG1.prototype.isPrototypeOf(x) ||
        !exports.CipherTextG2.prototype.isPrototypeOf(y)) throw ('exports.mul:bad type')
      const z = new exports.CipherTextGT()
      const xPos = x._allocAndCopy()
      const yPos = y._allocAndCopy()
      const zPos = z._alloc()
      func(zPos, xPos, yPos)
      z._saveAndFree(zPos)
      _free(yPos)
      _free(xPos)
      return z
    }
    // return func(x, p2)
    const callDec = (func, x, y) => {
      const xPos = x._allocAndCopy()
      const yPos = y._allocAndCopy()
      const r = func(xPos, yPos)
      _free(yPos)
      _free(xPos)
      return r
    }
    const callLoadTable = (func, a) => {
      const p = mod._malloc(a.length)
      for (let i = 0; i < a.length; i++) {
        mod.HEAP8[p + i] = a[i]
      }
      const n = func(p, a.length)
      _free(p)
      if (n == 0) throw ('callLoadTable err')
    }

    mod.sheSecretKeySerialize = _wrapSerialize(mod._sheSecretKeySerialize)
    mod.sheSecretKeyDeserialize = _wrapDeserialize(mod._sheSecretKeyDeserialize)
    mod.shePublicKeySerialize = _wrapSerialize(mod._shePublicKeySerialize)
    mod.shePublicKeyDeserialize = _wrapDeserialize(mod._shePublicKeyDeserialize)
    mod.sheCipherTextG1Serialize = _wrapSerialize(mod._sheCipherTextG1Serialize)
    mod.sheCipherTextG1Deserialize = _wrapDeserialize(mod._sheCipherTextG1Deserialize)
    mod.sheDecG1 = wrap_dec(mod._sheDecG1)
    mod.sheDecG1ViaGT = wrap_dec(mod._sheDecG1ViaGT)
    mod.sheCipherTextG2Serialize = _wrapSerialize(mod._sheCipherTextG2Serialize)
    mod.sheCipherTextG2Deserialize = _wrapDeserialize(mod._sheCipherTextG2Deserialize)
    mod.sheDecG2 = wrap_dec(mod._sheDecG2)
    mod.sheDecG2ViaGT = wrap_dec(mod._sheDecG2ViaGT)
    mod.sheCipherTextGTSerialize = _wrapSerialize(mod._sheCipherTextGTSerialize)
    mod.sheCipherTextGTDeserialize = _wrapDeserialize(mod._sheCipherTextGTDeserialize)
    mod.sheDecGT = wrap_dec(mod._sheDecGT)
    mod.sheZkpBinSerialize = _wrapSerialize(mod._sheZkpBinSerialize)
    mod.sheZkpBinDeserialize = _wrapDeserialize(mod._sheZkpBinDeserialize)

    class Common {
      constructor (size) {
        this.a_ = new Uint32Array(size / 4)
      }
      deserializeHexStr (s) {
        this.deserialize(exports.fromHexStr(s))
      }
      serializeToHexStr () {
        return exports.toHexStr(this.serialize())
      }
      dump (msg = '') {
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
      _saveAndFree (pos) {
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
    }
    exports.SecretKey = class extends Common {
      constructor () {
        super(SHE_SECRETKEY_SIZE)
      }
      deserialize (s) {
        this._setter(mod.sheSecretKeyDeserialize, s)
      }
      serialize () {
        return this._getter(mod.sheSecretKeySerialize)
      }
      setByCSPRNG () {
        const pos = this._alloc()
        mod._sheSecretKeySetByCSPRNG(pos)
        this._saveAndFree(pos)
      }
      getPublicKey () {
        const pub = new exports.PublicKey()
        const secPos = this._allocAndCopy()
        const pubPos = pub._alloc()
        mod._sheGetPublicKey(pubPos, secPos)
        pub._saveAndFree(pubPos)
        _free(secPos)
        return pub
      }
      dec (c) {
        let dec = null
        if (c instanceof exports.CipherTextG1) {
          dec = mod.sheDecG1
        } else if (c instanceof exports.CipherTextG2) {
          dec = mod.sheDecG2
        } else if (c instanceof exports.CipherTextGT) {
          dec = mod.sheDecGT
        } else {
          throw ('exports.SecretKey.dec:not supported')
        }
        return callDec(dec, this, c)
      }
      decViaGT (c) {
        let dec = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          dec = mod.sheDecG1ViaGT
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          dec = mod.sheDecG2ViaGT
        } else {
          throw ('exports.SecretKey.decViaGT:not supported')
        }
        return callDec(dec, this, c)
      }
      isZero (c) {
        let isZero = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroG2
        } else if (exports.CipherTextGT.prototype.isPrototypeOf(c)) {
          isZero = mod._sheIsZeroGT
        } else {
          throw ('exports.SecretKey.isZero:not supported')
        }
        const secPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const r = isZero(secPos, cPos)
        _free(cPos)
        _free(secPos)
        return r
      }
    }

    exports.deserializeHexStrToSecretKey = s => {
      const r = new exports.SecretKey()
      r.deserializeHexStr(s)
      return r
    }
    exports.PrecomputedPublicKey = class {
      constructor () {
        this.p = mod._shePrecomputedPublicKeyCreate()
      }
      /*
        call destroy if PrecomputedPublicKey is not necessary
        to avoid memory leak
      */
      destroy () {
        if (this.p == null) return
        mod._shePrecomputedPublicKeyDestroy(this.p)
        this.p = null
      }
      /*
        initialize PrecomputedPublicKey by PublicKey pub
      */
      init (pub) {
        const pubPos = pub._allocAndCopy()
        mod._shePrecomputedPublicKeyInit(this.p, pubPos)
        _free(pubPos)
      }
      encG1 (m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncG1, exports.CipherTextG1, this.p, m)
      }
      encG2 (m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncG2, exports.CipherTextG2, this.p, m)
      }
      encGT (m) {
        return callPPKEnc(mod._shePrecomputedPublicKeyEncGT, exports.CipherTextGT, this.p, m)
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m) {
        return callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG1, exports.CipherTextG1, this.p, m)
      }
      encWithZkpBinG2 (m) {
        return callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG2, exports.CipherTextG2, this.p, m)
      }
      verify (c, zkp) {
        let verify = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          verify = mod._shePrecomputedPublicKeyVerifyZkpBinG1
        } else
        if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          verify = mod._shePrecomputedPublicKeyVerifyZkpBinG2
        } else {
          throw ('exports.verify:bad type')
        }
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = verify(this.p, cPos, zkpPos)
        _free(zkpPos)
        _free(cPos)
        return r == 1
      }
    }
    exports.PublicKey = class extends Common {
      constructor () {
        super(SHE_PUBLICKEY_SIZE)
      }
      serialize () {
        return this._getter(mod.shePublicKeySerialize)
      }
      deserialize (s) {
        this._setter(mod.shePublicKeyDeserialize, s)
      }
      encG1 (m) {
        return callEnc(mod._sheEncG1, exports.CipherTextG1, this, m)
      }
      encG2 (m) {
        return callEnc(mod._sheEncG2, exports.CipherTextG2, this, m)
      }
      encGT (m) {
        return callEnc(mod._sheEncGT, exports.CipherTextGT, this, m)
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m) {
        return callEncWithZkpBin(mod._sheEncWithZkpBinG1, exports.CipherTextG1, this, m)
      }
      encWithZkpBinG2 (m) {
        return callEncWithZkpBin(mod._sheEncWithZkpBinG2, exports.CipherTextG2, this, m)
      }
      verify (c, zkp) {
        let func = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          func = mod._sheVerifyZkpBinG1
        } else
        if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          func = mod._sheVerifyZkpBinG2
        } else {
          throw ('exports.verify:bad type')
        }
        const pubPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = func(pubPos, cPos, zkpPos)
        _free(zkpPos)
        _free(cPos)
        _free(pubPos)
        return r == 1
      }
      reRand (c) {
        let func = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          func = mod._sheReRandG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          func = mod._sheReRandG2
        } else if (exports.CipherTextGT.prototype.isPrototypeOf(c)) {
          func = mod._sheReRandGT
        } else {
          throw ('exports.PublicKey.reRand:not supported')
        }
        const cPos = c._allocAndCopy()
        const pubPos = this._allocAndCopy()
        const r = func(cPos, pubPos)
        _free(pubPos)
        c._saveAndFree(cPos)
        if (r) throw ('reRand err')
      }
      // convert to CipherTextGT
      convert (c) {
        let func = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          func = mod._sheConvertG1
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          func = mod._sheConvertG2
        } else {
          throw ('exports.PublicKey.convert:not supported')
        }
        const ct = new exports.CipherTextGT()
        const ctPos = ct._alloc()
        const pubPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const r = func(ctPos, pubPos, cPos)
        _free(cPos)
        _free(pubPos)
        ct._saveAndFree(ctPos)
        if (r) throw ('callConvert err')
        return ct
      }
    }

    exports.deserializeHexStrToPublicKey = s => {
      const r = new exports.PublicKey()
      r.deserializeHexStr(s)
      return r
    }
    exports.CipherTextG1 = class extends Common {
      constructor () {
        super(SHE_CIPHERTEXT_G1_SIZE)
      }
      serialize () {
        return this._getter(mod.sheCipherTextG1Serialize)
      }
      deserialize (s) {
        this._setter(mod.sheCipherTextG1Deserialize, s)
      }
    }

    exports.deserializeHexStrToCipherTextG1 = s => {
      const r = new exports.CipherTextG1()
      r.deserializeHexStr(s)
      return r
    }
    exports.CipherTextG2 = class extends Common {
      constructor () {
        super(SHE_CIPHERTEXT_G2_SIZE)
      }
      serialize () {
        return this._getter(mod.sheCipherTextG2Serialize)
      }
      deserialize (s) {
        this._setter(mod.sheCipherTextG2Deserialize, s)
      }
    }

    exports.deserializeHexStrToCipherTextG2 = s => {
      const r = new exports.CipherTextG2()
      r.deserializeHexStr(s)
      return r
    }

    exports.CipherTextGT = class extends Common {
      constructor () {
        super(SHE_CIPHERTEXT_GT_SIZE)
      }
      serialize () {
        return this._getter(mod.sheCipherTextGTSerialize)
      }
      deserialize (s) {
        this._setter(mod.sheCipherTextGTDeserialize, s)
      }
    }

    exports.ZkpBin = class extends Common {
      constructor () {
        super(SHE_ZKPBIN_SIZE)
      }
      serialize () {
        return this._getter(mod.sheZkpBinSerialize)
      }
      deserialize (s) {
        this._setter(mod.sheZkpBinDeserialize, s)
      }
    }

    exports.deserializeHexStrToCipherTextGT = s => {
      const r = new exports.CipherTextGT()
      r.deserializeHexStr(s)
      return r
    }
    // return x + y
    exports.add = (x, y) => {
      if (x.a_.length != y.a_.length) throw ('exports.add:bad type')
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
        throw ('exports.add:not supported')
      }
      return callAddSub(add, cstr, x, y)
    }
    // return x - y
    exports.sub = (x, y) => {
      if (x.a_.length != y.a_.length) throw ('exports.sub:bad type')
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
        throw ('exports.sub:not supported')
      }
      return callAddSub(sub, cstr, x, y)
    }
    // return x * (int)y
    exports.mulInt = (x, y) => {
      let func = null
      let z = null
      if (exports.CipherTextG1.prototype.isPrototypeOf(x)) {
        func = mod._sheMulG1
        z = new exports.CipherTextG1()
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(x)) {
        func = mod._sheMulG2
        z = new exports.CipherTextG2()
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(x)) {
        func = mod._sheMulGT
        z = new exports.CipherTextGT()
      } else {
        throw ('exports.mulInt:not supported')
      }
      const zPos = z._alloc()
      const xPos = x._allocAndCopy()
      func(zPos, xPos, y)
      _free(xPos)
      z._saveAndFree(zPos)
      return z
    }
    // return (G1)x * (G2)y
    exports.mul = (x, y) => {
      return callMul(mod._sheMul, x, y)
    }
    exports.mulML = (x, y) => {
      return callMul(mod._sheMulML, x, y)
    }
    exports.finalExpGT = x => {
      const y = new exports.CipherTextGT()
      const xPos = x._allocAndCopy()
      const yPos = y._alloc()
      mod._sheFinalExpGT(yPos, xPos)
      y._saveAndFree(yPos)
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
    const r1 = mod._sheInit(curveType, MCLBN_FP_UNIT_SIZE)
    if (r1) throw ('_sheInit err')
    console.log(`initializing sheSetRangeForDLP(range=${range}, tryNum=${tryNum})`)
    const r2 = mod._sheSetRangeForDLP(range)
    if (r2) throw ('_sheSetRangeForDLP err')
    mod._sheSetTryNum(tryNum)
    console.log('finished')
  } // setup()
  /*
    init she
    @param curveType
    @param range [in] table size of DLP ; require 8 * table size
    @param tryNum [in] how many search ; O(tryNum) time
    can decrypt (range * tryNum) range value
  */
  exports.init = (curveType = exports.BN254, range = 1024, tryNum = defaultTryNum) => {
    if (curveType > 8) {
      console.log('WARNING : init(range, tryNum) is deprecated. use init(curveType, range, tryNum)')
      tryNum = range
      range = curveType
      curveType = exports.BN254
    }
    exports.curveType = curveType
    const name = 'she_c'
    return new Promise(resolve => {
      if (isNodeJs) {
        const path = require('path')
        const js = require(`./${name}.js`)
        const Module = {
          locateFile: baseName => { return path.join(__dirname, baseName) }
        }
        js(Module)
          .then(_mod => {
            exports.mod = _mod
            setup(exports, curveType, range, tryNum)
            resolve()
          })
      } else {
        fetch(`./${name}.wasm`) // eslint-disable-line
          .then(response => response.arrayBuffer())
          .then(buffer => new Uint8Array(buffer))
          .then(() => {
            exports.mod = Module() // eslint-disable-line
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
