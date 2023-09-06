const setupFactory = (createModule, getRandomValues) => {
  const exports = {}
  /* eslint-disable */
  exports.BN254 = 0
  exports.BN381_1 = 1
  exports.BN381_2 = 2
  exports.BN462 = 3
  exports.BN_SNARK1 = 4
  exports.BLS12_381 = 5

  exports.SECP224K1 = 101
  exports.SECP256K1 = 102
  exports.SECP384R1 = 103
  exports.NIST_P192 = 105
  exports.NIST_P224 = 106
  exports.NIST_P256 = 107

  const defaultTryNum = 2048

  const setup = (exports, curveType, range, tryNum) => {
    const mod = exports.mod
    const MCLBN_FP_UNIT_SIZE = 6
    const MCLBN_FR_UNIT_SIZE = 4
    const MCLBN_COMPILED_TIME_VAR = (MCLBN_FR_UNIT_SIZE * 10 + MCLBN_FP_UNIT_SIZE)
    const MCLBN_FP_SIZE = MCLBN_FP_UNIT_SIZE * 8
    const MCLBN_FR_SIZE = MCLBN_FR_UNIT_SIZE * 8
    const MCLBN_G1_SIZE = MCLBN_FP_SIZE * 3
    const MCLBN_G2_SIZE = MCLBN_FP_SIZE * 6
    const MCLBN_GT_SIZE = MCLBN_FP_SIZE * 12
    const SHE_SECRETKEY_SIZE = MCLBN_FR_SIZE * 2
    const SHE_PUBLICKEY_SIZE = MCLBN_G1_SIZE + MCLBN_G2_SIZE
    const SHE_CIPHERTEXT_G1_SIZE = MCLBN_G1_SIZE * 2
    const SHE_CIPHERTEXT_G2_SIZE = MCLBN_G2_SIZE * 2
    const SHE_CIPHERTEXT_GT_SIZE = MCLBN_GT_SIZE * 4
    const SHE_ZKPBIN_SIZE = MCLBN_FR_SIZE * 4
    const SHE_ZKPEQ_SIZE = MCLBN_FR_SIZE * 4
    const SHE_ZKPBINEQ_SIZE = MCLBN_FR_SIZE * 7
    const SHE_ZKPDEC_SIZE = MCLBN_FR_SIZE * 2
    const SHE_ZKPDECGT_SIZE = MCLBN_FR_SIZE * 4
    const SHE_AUX_SIZE = MCLBN_GT_SIZE * 4

    mod.g_his = []
    /*
      she libray always uses (malloc,free) in nested pairs.
    */
    const _mallocDebug = size => {
      const p = mod._malloc(size + 4)
      mod.HEAP8[p+size] = 0x12
      mod.HEAP8[p+size+1] = 0x34
      mod.HEAP8[p+size+2] = 0x56
      mod.HEAP8[p+size+3] = 0x78
      mod.g_his.push([p, size])
      return p
    }
    const _freeDebug = pos => {
      const ps = mod.g_his.pop()
      const p = ps[0]
      const size = ps[1]
      if (pos !== p) {
        console.log(`pos=${pos} oldPos=${p}`)
      }
      const v = mod.HEAP8[p+size] + (mod.HEAP8[p+size+1]<<8) + (mod.HEAP8[p+size+2]<<16) + (mod.HEAP8[p+size+3]<<24)
      if (v !== 0x78563412) {
        console.log(`ERR=${p} v=${v.toString(16)}`)
      }
      mod._free(pos)
    }
//    const _malloc = _mallocDebug
//    const _free = _freeDebug
    const _malloc = mod._malloc
    const _free = mod._free

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
        const maxBufSize = 3096
        const pos = _malloc(maxBufSize)
        const n = func(pos, maxBufSize, x, ioMode)
        if (n <= 0) {
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
        const pos = _malloc(buf.length)
        mod.HEAP8.set(buf, pos)
        const r = func(x, pos, buf.length)
        _free(pos)
        if (r === 0 || r !== buf.length) throw new Error('err _wrapDeserialize', buf)
      }
    }
    exports.free = x => {
      _free(x)
    }
    const wrap_dec = func => {
      return function (sec, c) {
        const pos = _malloc(8)
        const r = func(pos, sec, c)
        const v = mod.HEAP32[pos / 4]
        _free(pos)
        if (r) throw ('sheDec')
        return v
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
    const callPPKEncWithZkpSet = (func, cstr, pubPos, m, mVec) => {
      const mSize = mVec.length
      const c = new cstr()
      const cPos = c._alloc()
      const zkp = new exports.ZkpSet(mSize)
      const zkpPos = zkp._alloc()
      const tm = new exports.IntVec(mVec)
      const mVecPos = tm._allocAndCopy()
      const r = func(cPos, zkpPos, pubPos, m, mVecPos, mSize)
      _free(mVecPos)
      zkp._saveAndFree(zkpPos)
      c._saveAndFree(cPos)
      if (r) throw ('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    const callPPKEnc = (func, cstr, ppub, m) => {
      const c = new cstr()
      const cPos = c._alloc()
      const r = func(cPos, ppub, m)
      c._saveAndFree(cPos)
      if (r) throw ('callPPKEnc:' + m)
      return c
    }
    // return func(x, y)
    const callAddSub = (func, cstr, x, y) => {
      const z = new cstr()
      const stack = mod.stackSave()
      const xPos = x._sallocAndCopy()
      const yPos = y._sallocAndCopy()
      const zPos = z._salloc()
      func(zPos, xPos, yPos)
      z._save(zPos)
      mod.stackRestore(stack)
/*
      const xPos = x._allocAndCopy()
      const yPos = y._allocAndCopy()
      const zPos = z._alloc()
      func(zPos, xPos, yPos)
      z._saveAndFree(zPos)
      _free(yPos)
      _free(xPos)
*/
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
      const p = _malloc(a.length)
      for (let i = 0; i < a.length; i++) {
        mod.HEAP8[p + i] = a[i]
      }
      const n = func(p, a.length)
      _free(p)
      if (n == 0) throw ('callLoadTable err')
    }

    // return m (0 or 1) if c is generated ciphertext of m by randHistory
    // otherwise throw exception
    const _verifyCipherTextBin = (self, msg, c, randHistory) => {
      let method
      if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
        method = 'encG1'
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
        method = 'encG2'
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(c)) {
        method = 'encGT'
      } else {
        throw (`${msg}.verifyCipherTextBin:not supported`)
      }
      const serializedC = c.serializeToHexStr()

      for (let m = 0; m < 2; m++) {
        const c = self[method](m, randHistory)
        if (c.serializeToHexStr() === serializedC) return m
      }
      throw (`${msg}.verifyCipherTextBin:c not matched`)
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
    mod.sheZkpDecSerialize = _wrapSerialize(mod._sheZkpDecSerialize)
    mod.sheZkpDecDeserialize = _wrapDeserialize(mod._sheZkpDecDeserialize)
    mod.sheZkpBinEqSerialize = _wrapSerialize(mod._sheZkpBinEqSerialize)
    mod.sheZkpBinEqDeserialize = _wrapDeserialize(mod._sheZkpBinEqDeserialize)
    mod.sheZkpEqSerialize = _wrapSerialize(mod._sheZkpEqSerialize)
    mod.sheZkpEqDeserialize = _wrapDeserialize(mod._sheZkpEqDeserialize)
    mod.sheZkpDecGTSerialize = _wrapSerialize(mod._sheZkpDecGTSerialize)
    mod.sheZkpDecGTDeserialize = _wrapDeserialize(mod._sheZkpDecGTDeserialize)

    /*
      record random values used in enc methods and replay it
    */
    exports.RandHistory = class {
      constructor () {
        this.a_ = []
      }
      // alloc and convert byte array to Fr in the same way as setByCSPRNG()
      _allocAndConvert () {
        const n = this.a_[0].length
        const pos = _malloc(n)
        mod.HEAP8.set(this.a_[0], pos)
        mod._mclBnFr_setLittleEndian(pos, pos, n)
        return pos
      }
      // convert Fr to byte array and free
      _convertAndFree (pos) {
        const n = this.a_[0].length
        mod._mclBnFr_serialize(pos, n, pos)
        this.a_[0].set(mod.HEAP8.subarray(pos, pos + n))
        _free(pos)
      }
      // shallow copy n elements of this
      copy (n = 1) {
        const rh = new exports.RandHistory()
        if (this.a_.length < n) {
          throw new Error(`short size n=${n}`)
        }
        for (let i = 0; i < n; i++) {
          rh.a_.push(this.a_[i])
        }
        return rh
      }
      // r1 and r2 must be created by encG1()
      static add (r1, r2) {
        if (r1.a_.length !== 1 || r2.a_.length !== 1) {
          throw (`RandHistory:add:bad size of a:r1=${r1.a_.length} r2=${r2.a_.length}`)
        }
        const n = r1.a_[0].length
        // a_[0] is not Uint32Array but Uint8Array
        if (n !== r2.a_[0].length || n !== MCLBN_FR_SIZE) {
          throw (`RandHistory.add:bad size:n=${n} r2=${r2.a_[0].length}`)
        }
        const r = new exports.RandHistory()
        r.a_.push(new Uint8Array(n))
        const r1Pos = r1._allocAndConvert()
        const r2Pos = r2._allocAndConvert()
        const rPos = _malloc(n)
        mod._mclBnFr_add(rPos, r1Pos, r2Pos)
        r._convertAndFree(rPos)
        _free(r2Pos)
        _free(r1Pos)
        return r
      }
      getStr () {
        // Uint8Array is not array
        return JSON.stringify(this.a_.map(e=>Array.from(e)))
      }
      setStr (s) {
        this.a_ = JSON.parse(s)
      }
      clear () {
        this.a_ = []
      }
      /*
        reply mode : if this.a_[pos] exists, then randFunc() returns the value as a random value
        record mode : otherwise, the original randFunc() returns the value and record the value in a_[pos]
      */
      _set () {
        this.orgRandFunc_ = exports.getRandFunc()
        this.pos_ = 0
        exports.setRandFunc((a) => {
          const cur = this.a_[this.pos_]
          if (cur) {
            // if cur exists, then use it
            if (a.length !== cur.length) {
              throw (`bad length a.len=${a_.length}, pos_=${this.pos_}, len=${cur.length}`)
            }
            a.set(cur)
          } else {
            // if cur does not exist, then use orgRandFunc and record it
            this.orgRandFunc_(a)
            this.a_.push(a)
          }
          this.pos_++
        })
      }
      _reset () {
        exports.setRandFunc(this.orgRandFunc_)
      }
    }
    exports.strToRandHistory = (s) => {
      const rh = new exports.RandHistory()
      rh.setStr(s)
      return rh
    }
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
        return _malloc(this.a_.length * 4)
      }
      // alloc and copy a_ to mod.HEAP32[pos / 4]
      _allocAndCopy () {
        const pos = this._alloc()
        mod.HEAP32.set(this.a_, pos / 4)
        return pos
      }
      // stack alloc new array
      _salloc () {
        return mod.stackAlloc(this.a_.length * 4)
      }
      // stack alloc and copy a_ to mod.HEAP32[pos / 4]
      _sallocAndCopy () {
        const pos = this._salloc()
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
      decWithZkpDec (c, pub) {
        if (!(c instanceof exports.CipherTextG1)) {
          throw ('decWithZkpDec:not supported')
        }
        const zkp = new exports.ZkpDec()
        const mPos = _malloc(8)
        const zkpPos = zkp._alloc()
        const secPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const pubPos = pub._allocAndCopy()
        const r = mod._sheDecWithZkpDecG1(mPos, zkpPos, secPos, cPos, pubPos)
        _free(pubPos)
        _free(cPos)
        _free(secPos)
        zkp._saveAndFree(zkpPos)
        const m = mod.HEAP32[mPos / 4]
        _free(mPos)
        if (r) throw ('_sheDecWithZkpDecG1')
        return [m, zkp]
      }
      decWithZkpDecGT (c, aux) {
        if (!(c instanceof exports.CipherTextGT)) {
          throw ('decWithZkpDecGT:bad c')
        }
        const zkp = new exports.ZkpDecGT()
        const mPos = _malloc(8)
        const zkpPos = zkp._alloc()
        const secPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const auxPos = aux._allocAndCopy()
        const r = mod._sheDecWithZkpDecGT(mPos, zkpPos, secPos, cPos, auxPos)
        _free(auxPos)
        _free(cPos)
        _free(secPos)
        zkp._saveAndFree(zkpPos)
        const m = mod.HEAP32[mPos / 4]
        _free(mPos)
        if (r) throw ('_sheDecWithZkpDecGT')
        return [m, zkp]
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
      // return m (0 or 1) if c is generated ciphertext of m by randHistory
      // otherwise throw exception
      verifyCipherTextBin (c, randHistory) {
        return _verifyCipherTextBin(this, 'PrecomputedPublicKey', c, randHistory)
      }

      encG1 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEnc(mod._shePrecomputedPublicKeyEncG1, exports.CipherTextG1, this.p, m)
        if (rh) rh._reset()
        return r
      }
      encG2 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEnc(mod._shePrecomputedPublicKeyEncG2, exports.CipherTextG2, this.p, m)
        if (rh) rh._reset()
        return r
      }
      encGT (m, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEnc(mod._shePrecomputedPublicKeyEncGT, exports.CipherTextGT, this.p, m)
        if (rh) rh._reset()
        return r
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG1, exports.CipherTextG1, this.p, m)
        if (rh) rh._reset()
        return r
      }
      encWithZkpBinG2 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG2, exports.CipherTextG2, this.p, m)
        if (rh) rh._reset()
        return r
      }
      encWithZkpSetG1 (m, mVec, rh = undefined) {
        if (rh) rh._set()
        const r = callPPKEncWithZkpSet(mod._shePrecomputedPublicKeyEncWithZkpSetG1, exports.CipherTextG1, this.p, m, mVec)
        if (rh) rh._reset()
        return r
      }
      verify (c, zkp) {
        let verify = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          verify = mod._shePrecomputedPublicKeyVerifyZkpBinG1
        } else
        if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          verify = mod._shePrecomputedPublicKeyVerifyZkpBinG2
        }
        if (verify === null) {
          throw ('exports.verifyZkpBin:bad type')
        }
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = verify(this.p, cPos, zkpPos)
        _free(zkpPos)
        _free(cPos)
        return r === 1
      }
      verifyZkpSet (c, zkp, mVec) {
        let verify = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          verify = mod._shePrecomputedPublicKeyVerifyZkpSetG1
        }
        if (verify === null) {
          throw ('exports.verify:bad type')
        }
        const mSize = mVec.length
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const tm = new exports.IntVec(mVec)
        const mVecPos = tm._allocAndCopy()
        const r = verify(this.p, cPos, zkpPos, mVecPos, mSize)
        _free(mVecPos)
        _free(zkpPos)
        _free(cPos)
        return r === 1
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

      // return m (0 or 1) if c is generated ciphertext of m by randHistory
      // otherwise throw exception
      verifyCipherTextBin (c, randHistory) {
        return _verifyCipherTextBin(this, 'PublicKey', c, randHistory)
      }

      encG1 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callEnc(mod._sheEncG1, exports.CipherTextG1, this, m)
        if (rh) rh._reset()
        return r
      }
      encG2 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callEnc(mod._sheEncG2, exports.CipherTextG2, this, m)
        if (rh) rh._reset()
        return r
      }
      encGT (m, rh = undefined) {
        if (rh) rh._set()
        const r = callEnc(mod._sheEncGT, exports.CipherTextGT, this, m)
        if (rh) rh._reset()
        return r
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callEncWithZkpBin(mod._sheEncWithZkpBinG1, exports.CipherTextG1, this, m)
        if (rh) rh._reset()
        return r
      }
      encWithZkpBinG2 (m, rh = undefined) {
        if (rh) rh._set()
        const r = callEncWithZkpBin(mod._sheEncWithZkpBinG2, exports.CipherTextG2, this, m)
        if (rh) rh._reset()
        return r
      }
      encWithZkpSetG1 (m, mVec, rh = undefined) {
        if (rh) rh._set()
        const pubPos = this._allocAndCopy()
        const r = callPPKEncWithZkpSet(mod._sheEncWithZkpSetG1, exports.CipherTextG1, pubPos, m, mVec)
        _free(pubPos)
        if (rh) rh._reset()
        return r
      }

      // return [EncG1(m), EncG2(m), Zkp]
      encWithZkpBinEq (m, rh = undefined) {
        if (rh) rh._set()
        const pubPos = this._allocAndCopy()
        const c1 = new exports.CipherTextG1()
        const c1Pos = c1._alloc()
        const c2 = new exports.CipherTextG2()
        const c2Pos = c2._alloc()

        const zkp = new exports.ZkpBinEq()
        const zkpPos = zkp._alloc()
        const r = mod._sheEncWithZkpBinEq(c1Pos, c2Pos, zkpPos, pubPos, m)
        zkp._saveAndFree(zkpPos)
        c2._saveAndFree(c2Pos)
        c1._saveAndFree(c1Pos)
        _free(pubPos)
        if (rh) rh._reset()
        if (r) throw ('encWithZkpBinEq:bad m:' + m)
        return [c1, c2, zkp]
      }
      // check dec(c1) == dec(c2) in {0, 1}
      verifyZkpBinEq (c1, c2, zkp) {
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c1) || !exports.CipherTextG2.prototype.isPrototypeOf(c2)) {
          throw ('exports.verify:bad type')
        }
        const pubPos = this._allocAndCopy()
        const c1Pos = c1._allocAndCopy()
        const c2Pos = c2._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = mod._sheVerifyZkpBinEq(pubPos, c1Pos, c2Pos, zkpPos)
        _free(zkpPos)
        _free(c2Pos)
        _free(c1Pos)
        _free(pubPos)
        return r === 1
      }
      // return [EncG1(m), EncG2(m), Zkp]
      encWithZkpEq (m, rh = undefined) {
        if (rh) rh._set()
        const pubPos = this._allocAndCopy()
        const c1 = new exports.CipherTextG1()
        const c1Pos = c1._alloc()
        const c2 = new exports.CipherTextG2()
        const c2Pos = c2._alloc()

        const zkp = new exports.ZkpEq()
        const zkpPos = zkp._alloc()
        const r = mod._sheEncWithZkpEq(c1Pos, c2Pos, zkpPos, pubPos, m)
        zkp._saveAndFree(zkpPos)
        c2._saveAndFree(c2Pos)
        c1._saveAndFree(c1Pos)
        _free(pubPos)
        if (rh) rh._reset()
        if (r) throw ('encWithZkpEq:bad m:' + m)
        return [c1, c2, zkp]
      }
      // check dec(c1) == dec(c2)
      verifyZkpEq (c1, c2, zkp) {
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c1) || !exports.CipherTextG2.prototype.isPrototypeOf(c2)) {
          throw ('exports.verify:bad type')
        }
        const pubPos = this._allocAndCopy()
        const c1Pos = c1._allocAndCopy()
        const c2Pos = c2._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = mod._sheVerifyZkpEq(pubPos, c1Pos, c2Pos, zkpPos)
        _free(zkpPos)
        _free(c2Pos)
        _free(c1Pos)
        _free(pubPos)
        return r === 1
      }
      verify (c, zkp, m) {
        if (m !== undefined) {
          return this.verifyZkpDec(c, zkp, m)
        }
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
      verifyZkpSet (c, zkp, mVec) {
        let verify = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          verify = mod._sheVerifyZkpSetG1
        }
        if (verify === null) {
          throw ('exports.verify:bad type')
        }
        const pubPos = this._allocAndCopy()
        const mSize = mVec.length
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const tm = new exports.IntVec(mVec)
        const mVecPos = tm._allocAndCopy()
        const r = verify(pubPos, cPos, zkpPos, mVecPos, mSize)
        _free(mVecPos)
        _free(zkpPos)
        _free(cPos)
        _free(pubPos)
        return r === 1
      }
      verifyZkpDec (c, zkp, m) {
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          throw ('verifyZkpDec:bad type')
        }
        const pubPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = mod._sheVerifyZkpDecG1(pubPos, cPos, m, zkpPos)
        _free(zkpPos)
        _free(cPos)
        _free(pubPos)
        return r === 1
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
      getAuxiliaryForZkpDecGT () {
        const aux = new exports.AuxiliaryForZkpDecGT()
        const pubPos = this._allocAndCopy()
        const auxPos = aux._alloc()
        mod._sheGetAuxiliaryForZkpDecGT(auxPos, pubPos)
        aux._saveAndFree(auxPos)
        _free(pubPos)
        return aux
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

    exports.ZkpEq = class extends Common {
      constructor () {
        super(SHE_ZKPEQ_SIZE)
      }
      serialize () {
        return this._getter(mod.sheZkpEqSerialize)
      }
      deserialize (s) {
        this._setter(mod.sheZkpEqDeserialize, s)
      }
    }

    exports.ZkpBinEq = class extends Common {
      constructor() {
        super(SHE_ZKPBINEQ_SIZE)
      }
      serialize() {
        return this._getter(mod.sheZkpBinEqSerialize)
      }
      deserialize(s) {
        this._setter(mod.sheZkpBinEqDeserialize, s)
      }
    }

    exports.ZkpDec = class extends Common {
      constructor () {
        super(SHE_ZKPDEC_SIZE)
      }
      serialize () {
        return this._getter(mod.sheZkpDecSerialize)
      }
      deserialize (s) {
        this._setter(mod.sheZkpDecDeserialize, s)
      }
    }

    exports.ZkpDecGT = class extends Common {
      constructor () {
        super(SHE_ZKPDECGT_SIZE)
      }
      serialize () {
        return this._getter(mod.sheZkpDecGTSerialize)
      }
      deserialize (s) {
        this._setter(mod.sheZkpDecGTDeserialize, s)
      }
    }

    exports.AuxiliaryForZkpDecGT = class extends Common {
      constructor () {
        super(SHE_AUX_SIZE)
      }
      verify (c, zkp, m) {
        if (!exports.CipherTextGT.prototype.isPrototypeOf(c)) {
          throw ('verify:bad c')
        }
        const auxPos = this._allocAndCopy()
        const cPos = c._allocAndCopy()
        const zkpPos = zkp._allocAndCopy()
        const r = mod._sheVerifyZkpDecGT(auxPos, cPos, m, zkpPos)
        _free(zkpPos)
        _free(cPos)
        _free(auxPos)
        return r === 1
      }
    }

    exports.IntVec = class extends Common {
      constructor (a) {
        super(0)
        this.a_ = new Uint32Array(a)
      }
      serialize () {
        return new Uint8Array(this.a_.buffer)
      }
      deserialize (s) {
        this.a_ = new Uint32Array(s.buffer)
      }
    }
    exports.ZkpSet = class extends Common {
      constructor (n) {
        super(MCLBN_FR_SIZE * 2 * n)
      }
      serialize () {
        return new Uint8Array(this.a_.buffer)
      }
      deserialize (s) {
        this.a_ = new Uint32Array(s.buffer)
      }
    }

    exports.deserializeHexStrToCipherTextGT = s => {
      const r = new exports.CipherTextGT()
      r.deserializeHexStr(s)
      return r
    }
    // return -x
    exports.neg = x => {
      let func = null
      let y = null
      if (exports.CipherTextG1.prototype.isPrototypeOf(x)) {
        func = mod._sheNegG1
        y = new exports.CipherTextG1()
      } else if (exports.CipherTextG2.prototype.isPrototypeOf(x)) {
        func = mod._sheNegG2
        y = new exports.CipherTextG2()
      } else if (exports.CipherTextGT.prototype.isPrototypeOf(x)) {
        func = mod._sheNegGT
        y = new exports.CipherTextGT()
      } else {
        throw ('exports.neg:not supported')
      }
      const xPos = x._allocAndCopy()
      const yPos = y._alloc()
      func(yPos, xPos)
      y._saveAndFree(yPos)
      _free(xPos)
      return y
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
    exports.g1only = exports.SECP224K1 <= curveType && curveType <= exports.NIST_P256
    const initFunc = exports.g1only ? mod._sheInitG1only : mod._sheInit
    const setRangeFunc = exports.g1only ? mod._sheSetRangeForG1DLP : mod._sheSetRangeForDLP

    const r1 = initFunc(curveType, MCLBN_COMPILED_TIME_VAR)
    if (r1) throw (`init g1only=${exports.g1only} err=${r1}`)
    const r2 = setRangeFunc(range)
    if (r2) throw (`setRange g1only${exports.g1only} err=${r2}`)
    mod._sheSetTryNum(tryNum)
  } // setup()
  const _cryptoGetRandomValues = function(p, n) {
    const a = new Uint8Array(n)
    exports.getRandomValues(a)
    for (let i = 0; i < n; i++) {
      exports.mod.HEAP8[p + i] = a[i]
    }
  }
  exports.getRandFunc = () => {
    return exports.getRandomValues
  }
  exports.setRandFunc = (f) => {
    exports.getRandomValues = f
  }
  /*
    init she
    @param curveType
    @param range [in] table size of DLP ; require 8 * table size
    @param tryNum [in] how many search ; O(tryNum) time
    can decrypt (range * tryNum) range value
  */
  exports.init = async (curveType = exports.BN254, range = 1024, tryNum = defaultTryNum) => {
    exports.curveType = curveType
    exports.getRandomValues = getRandomValues
    exports.mod = await createModule({
      cryptoGetRandomValues: _cryptoGetRandomValues,
    })
    setup(exports, curveType, range, tryNum)
  }
  return exports
}

module.exports = setupFactory
