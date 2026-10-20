// The data supplier. Holds plaintext records and encrypts them with the
// analyst's public key. This file must not touch the DOM.

const userRecords = []

function userCount () {
  return userRecords.length
}

function userIsFull () {
  return userRecords.length >= MAX_USERS
}

function userGet (i) {
  return userRecords[i]
}

function userClear () {
  userRecords.length = 0
}

// Returns the index of the added record, or -1 if the demo is already full.
function userAdd (record) {
  if (userIsFull()) return -1
  userRecords.push(record)
  return userRecords.length - 1
}

// Returns how many records were actually added.
function userAddRandom (n) {
  let added = 0
  for (let i = 0; i < n && !userIsFull(); i++) {
    userAdd(randomRecord())
    added++
  }
  return added
}

// Encrypt one record into a packet of serialized ciphertexts.
// Each categorical attribute becomes a one-hot vector encrypted bit by bit in
// both G1 and G2, because she.mul only accepts a (G1, G2) pair and we do not
// know yet which attribute the analyst will put on which side.
function userEncryptOne (ppk, rec) {
  const onehot = {}
  for (const key of CAT_KEYS) {
    const bits = toOneHot(key, rec[key])
    onehot[key] = {
      g1: bits.map((b) => ppk.encG1(b).serialize()),
      g2: bits.map((b) => ppk.encG2(b).serialize())
    }
  }
  return {
    onehot,
    health: {
      g1: ppk.encG1(rec.health).serialize(),
      g2: ppk.encG2(rec.health).serialize()
    }
  }
}

// Encrypt every record. `ppk` is a PrecomputedPublicKey, which is about 2 to 3
// times faster than a plain PublicKey and matters here because each record
// needs 36 encryptions.
function userEncryptAll (ppk, onProgress) {
  const packets = []
  const step = (i) => {
    packets.push(userEncryptOne(ppk, userRecords[i]))
  }
  return runChunked(userRecords.length, step, onProgress).then(() => packets)
}
