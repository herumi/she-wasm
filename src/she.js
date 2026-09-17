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
    mod.g_ptr = {}
    mod.g_total = 0
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
      mod.g_ptr[p] = size
      mod.g_total += size
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
      const s = mod.g_ptr[pos]
      if (s == 0) {
        console.log(`ERR ${pos}`)
      } else {
        delete mod.g_ptr[pos]
        mod.g_total -= s
      }
    }
//    const _malloc = _mallocDebug
//    const _free = _freeDebug
    const _malloc = mod._malloc
    const _free = mod._free
    exports._showDebug = () => {
      if (_malloc === _mallocDebug) {
        console.log('malloc DEBUG mode')
        console.log(`  show total=${mod.g_total}`)
        console.log(`  g_ptr=${JSON.stringify(mod.g_ptr,null,'\t')}`)
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

    // shared wrappers defined in mcl/src/wasm/glue.js (embedded in she_c.js);
    // values are passed as Uint32Array (a_) and the stack is restored in finally
    const stackSave = mod.stackSave
    const stackAlloc = mod.stackAlloc
    const stackRestore = mod.stackRestore
    const salloc = mod.salloc
    const sallocCopy = mod.sallocCopy
    const copyFromHeap32 = mod.copyFromHeap32
    const callSetter = mod.callSetter
    const callGetter = mod.callGetter
    const callGetter2 = mod.callGetter2
    const callOp1 = mod.callOp1
    const callOp2 = mod.callOp2
    const callUpdate = mod.callUpdate
    const callDeserialize = mod.callDeserialize
    const callSerialize = mod.callSerialize

    exports.free = x => {
      _free(x)
    }
    // plaintexts are passed to wasm as C int; reject anything outside signed int32
    // instead of letting ToInt32 silently turn NaN / 2**40 / '2abc' into 0 or -1
    const assertInt32 = (m, label) => {
      if (typeof m !== 'number' || !Number.isInteger(m) || m < -0x80000000 || m > 0x7fffffff) {
        throw (label + ':bad int32:' + m)
      }
    }
    // return m where func(&m, x, y) decrypts ; m is int64 in wasm and its low 32 bits are returned
    const callDec = (func, x, y) => {
      const stack = stackSave()
      try {
        const mPos = stackAlloc(8)
        const xPos = sallocCopy(x.a_)
        const yPos = sallocCopy(y.a_)
        const r = func(mPos, xPos, yPos)
        if (r) throw ('sheDec')
        return mod.HEAP32[mPos >> 2]
      } finally {
        stackRestore(stack)
      }
    }
    // return func(x, y, z, p1)
    const callGetter3 = (func, x, y, z, p1) => {
      const stack = stackSave()
      try {
        const xPos = sallocCopy(x.a_)
        const yPos = sallocCopy(y.a_)
        const zPos = sallocCopy(z.a_)
        return func(xPos, yPos, zPos, p1)
      } finally {
        stackRestore(stack)
      }
    }
    // return func(x, y, z, w)
    const callGetter4 = (func, x, y, z, w) => {
      const stack = stackSave()
      try {
        const xPos = sallocCopy(x.a_)
        const yPos = sallocCopy(y.a_)
        const zPos = sallocCopy(z.a_)
        const wPos = sallocCopy(w.a_)
        return func(xPos, yPos, zPos, wPos)
      } finally {
        stackRestore(stack)
      }
    }
    // c = func(pub, m)
    const callEnc = (func, cstr, pub, m) => {
      assertInt32(m, 'enc')
      const c = new cstr()
      callOp1(func, c.a_, pub.a_, m)
      return c
    }
    // [c, zkp] = func(pubPos, m) ; pubPos is a wasm pointer (PrecomputedPublicKey or a stack copy)
    const callPPKEncWithZkpBin = (func, cstr, pubPos, m) => {
      assertInt32(m, 'encWithZkpBin')
      const c = new cstr()
      const zkp = new exports.ZkpBin()
      const stack = stackSave()
      let r
      try {
        const cPos = salloc(c.a_)
        const zkpPos = salloc(zkp.a_)
        r = func(cPos, zkpPos, pubPos, m)
        copyFromHeap32(zkp.a_, zkpPos)
        copyFromHeap32(c.a_, cPos)
      } finally {
        stackRestore(stack)
      }
      if (r) throw ('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    const callEncWithZkpBin = (func, cstr, pub, m) => {
      const stack = stackSave()
      try {
        const pubPos = sallocCopy(pub.a_)
        return callPPKEncWithZkpBin(func, cstr, pubPos, m)
      } finally {
        stackRestore(stack)
      }
    }
    const callPPKEncWithZkpSet = (func, cstr, pubPos, m, mVec) => {
      assertInt32(m, 'encWithZkpSet')
      mVec.forEach(v => assertInt32(v, 'encWithZkpSet:mVec'))
      const mSize = mVec.length
      const c = new cstr()
      const zkp = new exports.ZkpSet(mSize)
      const tm = new exports.IntVec(mVec)
      const stack = stackSave()
      let r
      try {
        const cPos = salloc(c.a_)
        const zkpPos = salloc(zkp.a_)
        const mVecPos = sallocCopy(tm.a_)
        r = func(cPos, zkpPos, pubPos, m, mVecPos, mSize)
        copyFromHeap32(zkp.a_, zkpPos)
        copyFromHeap32(c.a_, cPos)
      } finally {
        stackRestore(stack)
      }
      if (r) throw ('encWithZkpBin:bad m:' + m)
      return [c, zkp]
    }
    // c = func(ppub, m) ; ppub is a wasm pointer of PrecomputedPublicKey
    const callPPKEnc = (func, cstr, ppub, m) => {
      assertInt32(m, 'enc')
      const c = new cstr()
      callSetter(func, c.a_, ppub, m)
      return c
    }
    // return func(x, y)
    const callAddSub = (func, cstr, x, y) => {
      const z = new cstr()
      callOp2(func, z.a_, x.a_, y.a_)
      return z
    }
    // return func((G1)x, (G2)y)
    const callMul = (func, x, y) => {
      if (!exports.CipherTextG1.prototype.isPrototypeOf(x) ||
        !exports.CipherTextG2.prototype.isPrototypeOf(y)) throw ('exports.mul:bad type')
      const z = new exports.CipherTextGT()
      callOp2(func, z.a_, x.a_, y.a_)
      return z
    }
    // DLP tables may be large, so use the heap instead of the wasm stack
    const callLoadTable = (func, a) => {
      const p = _malloc(a.length)
      let n
      try {
        mod.HEAP8.set(a, p)
        n = func(p, a.length)
      } finally {
        _free(p)
      }
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


    /*
      record random values used in enc methods and replay it
    */
    exports.RandHistory = class {
      constructor () {
        this.a_ = []
      }
      // alloc and convert byte array to Fr in the same way as setByCSPRNG()
      // convert Fr to byte array
      _convertFr (pos) {
        const n = this.a_[0].length
        mod._mclBnFr_serialize(pos, n, pos)
        this.a_[0].set(mod.HEAP8.subarray(pos, pos + n))
      }
      // stack alloc and convert byte array to Fr in the same way as setByCSPRNG()
      _sallocAndConvert () {
        const n = this.a_[0].length
        const pos = mod.stackAlloc(n)
        mod.HEAP8.set(this.a_[0], pos)
        mod._mclBnFr_setLittleEndian(pos, pos, n)
        return pos
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
        const stack = stackSave()
        try {
          const r1Pos = r1._sallocAndConvert()
          const r2Pos = r2._sallocAndConvert()
          const rPos = stackAlloc(n)
          mod._mclBnFr_add(rPos, r1Pos, r2Pos)
          r._convertFr(rPos)
        } finally {
          stackRestore(stack)
        }
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
              throw (`bad length a.len=${a.length}, pos_=${this.pos_}, len=${cur.length}`)
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
    // call fn() with rh as the random source and always restore the original one
    const withRandHistory = (rh, fn) => {
      if (!rh) return fn()
      rh._set()
      try {
        return fn()
      } finally {
        rh._reset()
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
      // alloc and copy a_
      _allocAndCopy () {
        const pos = this._alloc()
        mod.copyToHeap32(this.a_, pos)
        return pos
      }
      // stack alloc new array
      _salloc () {
        return salloc(this.a_)
      }
      // stack alloc and copy a_
      _sallocAndCopy () {
        return sallocCopy(this.a_)
      }
      // save pos to a_
      _save (pos) {
        copyFromHeap32(this.a_, pos)
      }
      // save and free
      _saveAndFree (pos) {
        this._save(pos)
        _free(pos)
      }
      // this = func(p1, p2) ; throw if func returns non-zero (p1, p2 may be undefined)
      _setter (func, p1, p2) {
        callSetter(func, this.a_, p1, p2)
      }
      // return func(this, p1, p2)
      _getter (func, p1, p2) {
        return callGetter(func, this.a_, p1, p2)
      }
      _deserialize (func, buf) {
        callDeserialize(func, this.a_, buf)
      }
      _serialize (func) {
        return callSerialize(func, this.a_)
      }
    }
    exports.SecretKey = class extends Common {
      constructor () {
        super(SHE_SECRETKEY_SIZE)
      }
      deserialize (s) {
        this._deserialize(mod._sheSecretKeyDeserialize, s)
      }
      serialize () {
        return this._serialize(mod._sheSecretKeySerialize)
      }
      setByCSPRNG () {
        callSetter(mod._sheSecretKeySetByCSPRNG, this.a_)
      }
      getPublicKey () {
        const pub = new exports.PublicKey()
        callOp1(mod._sheGetPublicKey, pub.a_, this.a_)
        return pub
      }
      dec (c) {
        let dec = null
        if (c instanceof exports.CipherTextG1) {
          dec = mod._sheDecG1
        } else if (c instanceof exports.CipherTextG2) {
          dec = mod._sheDecG2
        } else if (c instanceof exports.CipherTextGT) {
          dec = mod._sheDecGT
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
        const stack = stackSave()
        try {
          const mPos = stackAlloc(8)
          const zkpPos = salloc(zkp.a_)
          const secPos = sallocCopy(this.a_)
          const cPos = sallocCopy(c.a_)
          const pubPos = sallocCopy(pub.a_)
          const r = mod._sheDecWithZkpDecG1(mPos, zkpPos, secPos, cPos, pubPos)
          if (r) throw ('_sheDecWithZkpDecG1')
          copyFromHeap32(zkp.a_, zkpPos)
          return [mod.HEAP32[mPos >> 2], zkp]
        } finally {
          stackRestore(stack)
        }
      }
      decWithZkpDecGT (c, aux) {
        if (!(c instanceof exports.CipherTextGT)) {
          throw ('decWithZkpDecGT:bad c')
        }
        const zkp = new exports.ZkpDecGT()
        const stack = stackSave()
        try {
          const mPos = stackAlloc(8)
          const zkpPos = salloc(zkp.a_)
          const secPos = sallocCopy(this.a_)
          const cPos = sallocCopy(c.a_)
          const auxPos = sallocCopy(aux.a_)
          const r = mod._sheDecWithZkpDecGT(mPos, zkpPos, secPos, cPos, auxPos)
          if (r) throw ('_sheDecWithZkpDecGT')
          copyFromHeap32(zkp.a_, zkpPos)
          return [mod.HEAP32[mPos >> 2], zkp]
        } finally {
          stackRestore(stack)
        }
      }
      decViaGT (c) {
        let dec = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          dec = mod._sheDecG1ViaGT
        } else if (exports.CipherTextG2.prototype.isPrototypeOf(c)) {
          dec = mod._sheDecG2ViaGT
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
        return callGetter2(isZero, this.a_, c.a_)
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
      // call destroy to avoid memory leak if PrecomputedPublicKey is not necessary
      destroy () {
        if (this.p == null) return
        mod._shePrecomputedPublicKeyDestroy(this.p)
        this.p = null
      }
      /*
        initialize PrecomputedPublicKey by PublicKey pub
      */
      init (pub) {
        callGetter((pubPos, p) => mod._shePrecomputedPublicKeyInit(p, pubPos), pub.a_, this.p)
      }
      // return m (0 or 1) if c is generated ciphertext of m by randHistory
      // otherwise throw exception
      verifyCipherTextBin (c, randHistory) {
        return _verifyCipherTextBin(this, 'PrecomputedPublicKey', c, randHistory)
      }

      encG1 (m, rh = undefined) {
        return withRandHistory(rh, () => callPPKEnc(mod._shePrecomputedPublicKeyEncG1, exports.CipherTextG1, this.p, m))
      }
      encG2 (m, rh = undefined) {
        return withRandHistory(rh, () => callPPKEnc(mod._shePrecomputedPublicKeyEncG2, exports.CipherTextG2, this.p, m))
      }
      encGT (m, rh = undefined) {
        return withRandHistory(rh, () => callPPKEnc(mod._shePrecomputedPublicKeyEncGT, exports.CipherTextGT, this.p, m))
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m, rh = undefined) {
        return withRandHistory(rh, () => callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG1, exports.CipherTextG1, this.p, m))
      }
      encWithZkpBinG2 (m, rh = undefined) {
        return withRandHistory(rh, () => callPPKEncWithZkpBin(mod._shePrecomputedPublicKeyEncWithZkpBinG2, exports.CipherTextG2, this.p, m))
      }
      encWithZkpSetG1 (m, mVec, rh = undefined) {
        return withRandHistory(rh, () => callPPKEncWithZkpSet(mod._shePrecomputedPublicKeyEncWithZkpSetG1, exports.CipherTextG1, this.p, m, mVec))
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
        return callGetter2((cPos, zkpPos, p) => verify(p, cPos, zkpPos), c.a_, zkp.a_, this.p) === 1
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
        const tm = new exports.IntVec(mVec)
        return callGetter3((cPos, zkpPos, mVecPos, p) => verify(p, cPos, zkpPos, mVecPos, mSize), c, zkp, tm, this.p) === 1
      }
    }
    exports.PublicKey = class extends Common {
      constructor () {
        super(SHE_PUBLICKEY_SIZE)
      }
      serialize () {
        return this._serialize(mod._shePublicKeySerialize)
      }
      deserialize (s) {
        this._deserialize(mod._shePublicKeyDeserialize, s)
      }

      // return m (0 or 1) if c is generated ciphertext of m by randHistory
      // otherwise throw exception
      verifyCipherTextBin (c, randHistory) {
        return _verifyCipherTextBin(this, 'PublicKey', c, randHistory)
      }

      encG1 (m, rh = undefined) {
        return withRandHistory(rh, () => callEnc(mod._sheEncG1, exports.CipherTextG1, this, m))
      }
      encG2 (m, rh = undefined) {
        return withRandHistory(rh, () => callEnc(mod._sheEncG2, exports.CipherTextG2, this, m))
      }
      encGT (m, rh = undefined) {
        return withRandHistory(rh, () => callEnc(mod._sheEncGT, exports.CipherTextGT, this, m))
      }
      // return [Enc(m), Zkp]
      encWithZkpBinG1 (m, rh = undefined) {
        return withRandHistory(rh, () => callEncWithZkpBin(mod._sheEncWithZkpBinG1, exports.CipherTextG1, this, m))
      }
      encWithZkpBinG2 (m, rh = undefined) {
        return withRandHistory(rh, () => callEncWithZkpBin(mod._sheEncWithZkpBinG2, exports.CipherTextG2, this, m))
      }
      encWithZkpSetG1 (m, mVec, rh = undefined) {
        return withRandHistory(rh, () => {
          const stack = stackSave()
          try {
            const pubPos = sallocCopy(this.a_)
            return callPPKEncWithZkpSet(mod._sheEncWithZkpSetG1, exports.CipherTextG1, pubPos, m, mVec)
          } finally {
            stackRestore(stack)
          }
        })
      }

      // return [EncG1(m), EncG2(m), Zkp]
      encWithZkpBinEq (m, rh = undefined) {
        assertInt32(m, 'encWithZkpBinEq')
        return withRandHistory(rh, () => {
          const c1 = new exports.CipherTextG1()
          const c2 = new exports.CipherTextG2()
          const zkp = new exports.ZkpBinEq()
          const stack = stackSave()
          let r
          try {
            const pubPos = sallocCopy(this.a_)
            const c1Pos = salloc(c1.a_)
            const c2Pos = salloc(c2.a_)
            const zkpPos = salloc(zkp.a_)
            r = mod._sheEncWithZkpBinEq(c1Pos, c2Pos, zkpPos, pubPos, m)
            copyFromHeap32(zkp.a_, zkpPos)
            copyFromHeap32(c2.a_, c2Pos)
            copyFromHeap32(c1.a_, c1Pos)
          } finally {
            stackRestore(stack)
          }
          if (r) throw ('encWithZkpBinEq:bad m:' + m)
          return [c1, c2, zkp]
        })
      }
      // check dec(c1) == dec(c2) in {0, 1}
      verifyZkpBinEq (c1, c2, zkp) {
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c1) || !exports.CipherTextG2.prototype.isPrototypeOf(c2)) {
          throw ('exports.verify:bad type')
        }
        return callGetter4(mod._sheVerifyZkpBinEq, this, c1, c2, zkp) === 1
      }
      // return [EncG1(m), EncG2(m), Zkp]
      encWithZkpEq (m, rh = undefined) {
        assertInt32(m, 'encWithZkpEq')
        return withRandHistory(rh, () => {
          const c1 = new exports.CipherTextG1()
          const c2 = new exports.CipherTextG2()
          const zkp = new exports.ZkpEq()
          const stack = stackSave()
          let r
          try {
            const pubPos = sallocCopy(this.a_)
            const c1Pos = salloc(c1.a_)
            const c2Pos = salloc(c2.a_)
            const zkpPos = salloc(zkp.a_)
            r = mod._sheEncWithZkpEq(c1Pos, c2Pos, zkpPos, pubPos, m)
            copyFromHeap32(zkp.a_, zkpPos)
            copyFromHeap32(c2.a_, c2Pos)
            copyFromHeap32(c1.a_, c1Pos)
          } finally {
            stackRestore(stack)
          }
          if (r) throw ('encWithZkpEq:bad m:' + m)
          return [c1, c2, zkp]
        })
      }
      // check dec(c1) == dec(c2)
      verifyZkpEq (c1, c2, zkp) {
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c1) || !exports.CipherTextG2.prototype.isPrototypeOf(c2)) {
          throw ('exports.verify:bad type')
        }
        return callGetter4(mod._sheVerifyZkpEq, this, c1, c2, zkp) === 1
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
        return callGetter3(func, this, c, zkp) == 1
      }
      verifyZkpSet (c, zkp, mVec) {
        let verify = null
        if (exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          verify = mod._sheVerifyZkpSetG1
        }
        if (verify === null) {
          throw ('exports.verify:bad type')
        }
        const mSize = mVec.length
        const tm = new exports.IntVec(mVec)
        return callGetter4((pubPos, cPos, zkpPos, mVecPos) => verify(pubPos, cPos, zkpPos, mVecPos, mSize), this, c, zkp, tm) === 1
      }
      verifyZkpDec (c, zkp, m) {
        assertInt32(m, 'verifyZkpDec')
        if (!exports.CipherTextG1.prototype.isPrototypeOf(c)) {
          throw ('verifyZkpDec:bad type')
        }
        return callGetter3((pubPos, cPos, zkpPos, m) => mod._sheVerifyZkpDecG1(pubPos, cPos, m, zkpPos), this, c, zkp, m) === 1
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
        const r = callUpdate(func, c.a_, this.a_)
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
        const r = callOp2(func, ct.a_, this.a_, c.a_)
        if (r) throw ('callConvert err')
        return ct
      }
      getAuxiliaryForZkpDecGT () {
        const aux = new exports.AuxiliaryForZkpDecGT()
        callOp1(mod._sheGetAuxiliaryForZkpDecGT, aux.a_, this.a_)
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
        return this._serialize(mod._sheCipherTextG1Serialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheCipherTextG1Deserialize, s)
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
        return this._serialize(mod._sheCipherTextG2Serialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheCipherTextG2Deserialize, s)
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
        return this._serialize(mod._sheCipherTextGTSerialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheCipherTextGTDeserialize, s)
      }
    }

    exports.ZkpBin = class extends Common {
      constructor () {
        super(SHE_ZKPBIN_SIZE)
      }
      serialize () {
        return this._serialize(mod._sheZkpBinSerialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheZkpBinDeserialize, s)
      }
    }

    exports.ZkpEq = class extends Common {
      constructor () {
        super(SHE_ZKPEQ_SIZE)
      }
      serialize () {
        return this._serialize(mod._sheZkpEqSerialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheZkpEqDeserialize, s)
      }
    }

    exports.ZkpBinEq = class extends Common {
      constructor() {
        super(SHE_ZKPBINEQ_SIZE)
      }
      serialize() {
        return this._serialize(mod._sheZkpBinEqSerialize)
      }
      deserialize(s) {
        this._deserialize(mod._sheZkpBinEqDeserialize, s)
      }
    }

    exports.ZkpDec = class extends Common {
      constructor () {
        super(SHE_ZKPDEC_SIZE)
      }
      serialize () {
        return this._serialize(mod._sheZkpDecSerialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheZkpDecDeserialize, s)
      }
    }

    exports.ZkpDecGT = class extends Common {
      constructor () {
        super(SHE_ZKPDECGT_SIZE)
      }
      serialize () {
        return this._serialize(mod._sheZkpDecGTSerialize)
      }
      deserialize (s) {
        this._deserialize(mod._sheZkpDecGTDeserialize, s)
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
        assertInt32(m, 'verify')
        return callGetter3((auxPos, cPos, zkpPos, m) => mod._sheVerifyZkpDecGT(auxPos, cPos, m, zkpPos), this, c, zkp, m) === 1
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
      callOp1(func, y.a_, x.a_)
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
      assertInt32(y, 'mulInt')
      callOp1(func, z.a_, x.a_, y)
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
      callOp1(mod._sheFinalExpGT, y.a_, x.a_)
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
  // glue.js calls this with a Uint8Array to be filled
  const _cryptoGetRandomValues = function(a) {
    exports.getRandomValues(a)
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
      prefix: 'she',
    })
    setup(exports, curveType, range, tryNum)
  }
  return exports
}

module.exports = setupFactory
