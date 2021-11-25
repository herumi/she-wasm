/*
  This example show how to perform state of art
  homomorphic vote system using she wasm lib

  IMPORTANT: This example is focused on available she wasm operations
  and do not cover: benaloh ballot invalidation, client/server serialization,
  private key management, transport security, voter voting rights,
  record as cast system, database traceability and many other
  systems needed to ensure security of a vote system
  Author Moumouls
*/

const she = require('../src/index.js')

/*
  Structure of the expected client ballot
  The ballot business logic will be:
  - You can vote only for 1 list
  - Lists and candidates values should be 0 or 1
  - You can vote only for candidates into the selected list
  - You should select at least 1 candidate into the selected list

  This business logic is quite complex but we will see that
  we can cover it all with many kind of ZKPs
*/
const ballotStructure = {
  oneSelectedListZkp: true,
  lists: {
    list1: {
      value: true,
      atLeastOneCandidateZkp: true,
      candidates: {
        candidate1: {
          value: true
        },
        candidate2: {
          value: true
        }
      }
    },
    list2: {
      value: true,
      atLeastOneCandidateZkp: true,
      candidates: {
        candidate3: {
          value: true
        },
        candidate4: {
          value: true
        }
      }
    }
  }
}

/*
  Shared class could be used on both server side and client side
  verify utils should be available on both sides
*/
class Shared {
  static aggregateUrn (urn) {
    return urn.reduce((accUrn, ballot) => {
      if (!accUrn) {
        accUrn = ballot
      }
      const lists = Object.keys(accUrn.lists).reduce((accLists, listId) => {
        const accUrnList = accUrn.lists[listId]
        const ballotList = ballot.lists[listId]
        const candidates = Object.keys(accUrnList.candidates).reduce((accCandidates, candidateId) => {
          const accUrnCandidate = accUrnList.candidates[candidateId]
          const ballotCandidate = ballotList.candidates[candidateId]
          accCandidates[candidateId] = { value: { c: she.add(accUrnCandidate.value.c, ballotCandidate.value.c) } }
          return accCandidates
        }, {})
        accLists[listId] = { value: { c: she.add(accUrnList.value.c, ballotList.value.c) }, candidates }
        return accLists
      }, {})
      return { lists }
    }, undefined)
  }

  /*
    Verify all Zkps of the ballot
    and replay cypher texts additions for ZkpOdd and ZkpOne
  */
  static verifyBallot (encryptedBallot, pub) {
    const listAddition = this.getElementsAdditionAndCheckZkpBin(encryptedBallot.lists, pub)
    if (!pub.verifyZkpSet(listAddition.c, encryptedBallot.oneSelectedListZkp, [1])) throw new Error('Invalid list Zkp one')
    Object.keys(encryptedBallot.lists).forEach((listId) => {
      const list = encryptedBallot.lists[listId]
      const candidateAddition = this.getElementsAdditionAndCheckZkpBin(list.candidates, pub)
      const oddAddition = { c: she.add(candidateAddition.c, she.add(candidateAddition.c, list.value.c)) }
      const candidatesLength = Object.keys(list.candidates).length
      const zkpOddSetElements = Array.from({ length: (candidatesLength) * 2 + 2 }).map((v, i) => i).filter((v) => v % 2 && v !== 1)
      zkpOddSetElements.unshift(0)
      if (!pub.verifyZkpSet(oddAddition.c, list.atLeastOneCandidateZkp, zkpOddSetElements)) throw new Error('Invalid list Zkp odd')
    })
  }

  // Verify that each value is 1 or 0
  static getElementsAdditionAndCheckZkpBin (elements, pub) {
    return Object.keys(elements).reduce((acc, elementId) => {
      const element = elements[elementId].value
      if (!pub.verify(element.c, element.zkp)) throw new Error('Invalid ballot value')
      if (!acc.c) return { c: element.c }
      acc.c = she.add(acc.c, element.c)
      return acc
    }, { c: undefined })
  }
}

// Actions related to client side
class Client {
  constructor (pub, clearBallot, serverInstance) {
    if (!pub) throw new Error('Missing public key')
    if (!clearBallot) throw new Error('Missing clear ballot')
    if (!serverInstance) throw new Error('Missing serverInstance')
    this.clearBallot = clearBallot
    this.pub = new she.PrecomputedPublicKey()
    this.pub.init(pub)
    this.nonPrecomputedPub = pub
    this.serverInstance = serverInstance
  }

  /*
    For simplicity during all the client process
    we will keep m and rh
    m and rh NEED to be removed before vote
    m NEED to be removed before challenge
  */
  encryptValue (value = false) {
    const m = value ? 1 : 0
    // Let's track random values used during encryption
    const rh = new she.RandHistory()
    const [c, zkp] = this.pub.encWithZkpBinG1(m, rh)
    // This new random history will be used to perform random history additions
    const rhCypherText = new she.RandHistory()
    /*
      For random history addition, random history need
      to only have 1 element, the first element of the listRh
      is the random value used to encrypt listId value
    */
    rhCypherText.a = [rh.a[0]]
    return { c, zkp, rh, rhCypherText, m }
  }

  // Remove m and rh if needed
  cleanUpValue (encryptedValue, keepRh = false) {
    const { zkp, c, rh } = encryptedValue
    return { zkp, c, rh: keepRh ? rh : undefined }
  }

  // Remove all m and rh if needed
  cleanUpEncryptedBallot (encryptedBallot, keepRh = false) {
    const lists = Object.keys(encryptedBallot.lists).reduce((accLists, listId) => {
      const list = encryptedBallot.lists[listId]
      list.value = this.cleanUpValue(list.value, keepRh)
      list.candidates = Object.keys(list.candidates).reduce((accCandidates, candidateId) => {
        const candidate = list.candidates[candidateId]
        candidate.value = this.cleanUpValue(candidate.value, keepRh)
        accCandidates[candidateId] = candidate
        return accCandidates
      }, {})
      accLists[listId] = list
      return accLists
    }, {})
    encryptedBallot.lists = lists
    return encryptedBallot
  }

  // Create the ZKP to cover the business logic related to the candidate/list relationship
  getAtLeastOneCandidateOnSelectedListZkp (encryptedList, candidates) {
    const addedCandidates = this.getElementsAddition(candidates)

    const addedCandidatesWithList = {
      rh: she.RandHistory.add(addedCandidates.rh, encryptedList.rhCypherText),
      c: she.add(addedCandidates.c, encryptedList.c),
      m: addedCandidates.m + encryptedList.m
    }

    /*
      Here we are computing
      rh = (candidateR1 + candidateR2 + candidateRX) * 2 + listR
      c = (candidateC1 + candidateC2 + candidateCX) * 2 + listC
      m = (candidateM1 + candidateM2 + candidateCM) * 2 + listM
      this mathematical operation allow to prove that m should be 0 or > 2 and odd
      (0 + 0)*2 + 0 = 0 OK
      (1 + 1)*2 + 1 = 5 OK
      (0)*2 + 1 = 1 NOK
      (1)*2 + 1 = 3 OK
      (1 + 1 + 1)*2 + 0 = 6 NOK
    */
    const oddAddition = {
      rh: she.RandHistory.add(addedCandidatesWithList.rh, addedCandidates.rh),
      c: she.add(addedCandidatesWithList.c, addedCandidates.c),
      m: addedCandidatesWithList.m + addedCandidates.m
    }

    const candidatesLength = Object.keys(candidates).length
    // Array will looks like: [0, 2, 5, 7, 9, oddNumber] length depend of candidate number
    const zkpOddSetElements = Array.from({ length: (candidatesLength) * 2 + 2 }).map((v, i) => i).filter((v) => v % 2 && v !== 1)
    // Authorize 0 value
    zkpOddSetElements.unshift(0)
    const [c, zkp] = this.pub.encWithZkpSetG1(oddAddition.m, zkpOddSetElements, oddAddition.rh)
    if (c.serializeToHexStr() !== oddAddition.c.serializeToHexStr()) throw new Error('Generation error for Zkp Odd')
    return zkp
  }

  // Add value and rand history from object keys
  getElementsAddition (elements) {
    return Object.keys(elements).reduce((acc, elementId) => {
      const element = elements[elementId].value
      if (!acc.rh) return { rh: element.rhCypherText, c: element.c, m: element.m }
      acc.rh = she.RandHistory.add(acc.rh, element.rhCypherText)
      acc.c = she.add(acc.c, element.c)
      acc.m = acc.m + element.m
      return acc
    }, { rh: undefined, c: undefined, m: undefined })
  }

  /*
    Get the Zkp to prove l1 + l2 + lX === 1
    Once lists are added we can reproduce c from encWithZkpSetG1 and get the Zkp Set for m === 1
  */
  getAtLeastOneListSelectedZkp (encryptedLists) {
    const addedEncryptedList = this.getElementsAddition(encryptedLists)
    const [c, zkp] = this.pub.encWithZkpSetG1(addedEncryptedList.m, [1], addedEncryptedList.rh)
    if (c.serializeToHexStr() !== addedEncryptedList.c.serializeToHexStr()) throw new Error('Generation error for Zkp One')
    return zkp
  }

  encrypt () {
    const encryptedLists = Object.keys(ballotStructure.lists).reduce((accLists, listId) => {
      const list = this.clearBallot.lists[listId]
      const encryptedList = this.encryptValue(list.value)

      const encryptedCandidates = Object.keys(list.candidates).reduce((accCandidates, candidateId) => {
        const encryptedCandidate = this.encryptValue(list.candidates[candidateId].value)
        accCandidates[candidateId] = { value: encryptedCandidate }
        return accCandidates
      }, {})

      accLists[listId] = {
        value: encryptedList,
        atLeastOneCandidateZkp: this.getAtLeastOneCandidateOnSelectedListZkp(encryptedList, encryptedCandidates),
        candidates: encryptedCandidates
      }

      return accLists
    }, {})

    return {
      oneSelectedListZkp: this.getAtLeastOneListSelectedZkp(encryptedLists),
      lists: encryptedLists
    }
  }

  // Modified Benaloh challenge system, client will send all random history
  challenge () {
    // We need to keep Rh to reproduce cypher texts on server side
    const encryptedBallot = this.cleanUpEncryptedBallot(this.encrypt(), true)
    const challengedBallot = this.serverInstance.challenge(encryptedBallot)
    Object.keys(ballotStructure.lists).forEach((listId) => {
      const clearBallotList = this.clearBallot.lists[listId]
      const challengeBallotList = challengedBallot.lists[listId]
      const ballotStructureList = ballotStructure.lists[listId]
      if (clearBallotList.value !== challengeBallotList.value) {
        throw new Error(`Value mismatch on list ${listId}`)
      }
      Object.keys(ballotStructureList.candidates).forEach((candidateId) => {
        const clearBallotCandidate = clearBallotList.candidates[candidateId]
        const challengeBallotCandidate = challengeBallotList.candidates[candidateId]
        if (clearBallotCandidate.value !== challengeBallotCandidate.value) {
          throw new Error(`Value mismatch on list ${listId} and candidate ${candidateId}`)
        }
      })
    })
  }

  // Encrypt and send the ballot to the server
  vote () {
    const encryptedBallot = this.cleanUpEncryptedBallot(this.encrypt())
    this.serverInstance.registerBallot(encryptedBallot)
  }

  // Verify a ballot structure and ZKps
  verifyBallot (ballot) {
    Shared.verifyBallot(ballot, this.pub)
  }

  decryptAggregatedUrn (aggregatedUrn, sec) {
    const lists = Object.keys(aggregatedUrn.lists).reduce((accLists, listId) => {
      const list = aggregatedUrn.lists[listId]
      const [m, zkp] = sec.decWithZkpDec(list.value.c, this.nonPrecomputedPub)
      const candidates = Object.keys(list.candidates).reduce((accCandidates, candidateId) => {
        const candidate = list.candidates[candidateId]
        const [m, zkp] = sec.decWithZkpDec(candidate.value.c, this.nonPrecomputedPub)
        accCandidates[candidateId] = { value: { zkp, m, c: candidate.value.c } }
        return accCandidates
      }, {})
      accLists[listId] = { value: { zkp, m, c: list.value.c }, candidates }
      return accLists
    }, {})

    return { lists }
  }

  verifyDecryptedUrn (urn, decryptedUrn) {
    // Let's aggregate again the urn on client side
    const aggregatedUrn = Shared.aggregateUrn(urn)
    Object.keys(aggregatedUrn.lists).forEach((listId) => {
      const list = aggregatedUrn.lists[listId]
      const decryptedList = decryptedUrn.lists[listId]
      // We can check first if external aggregated result match the local aggregated result
      if (list.value.c.serializeToHexStr() !== decryptedList.value.c.serializeToHexStr()) throw new Error(`Aggregation and decrypted list do not match ${listId}`)
      if (!this.nonPrecomputedPub.verify(list.value.c, decryptedList.value.zkp, decryptedList.value.m)) throw new Error(`m or zkp do not match on the decrypted list result ${listId}`)
      Object.keys(list.candidates).forEach((candidateId) => {
        const candidate = list.candidates[candidateId]
        const decryptedCandidate = decryptedList.candidates[candidateId]
        // We can check first if external aggregated result match the local aggregated result
        if (candidate.value.c.serializeToHexStr() !== decryptedCandidate.value.c.serializeToHexStr()) throw new Error(`Aggregation and decrypted candidate do not match ${listId} ${candidateId}`)
        if (!this.nonPrecomputedPub.verify(candidate.value.c, decryptedCandidate.value.zkp, decryptedCandidate.value.m)) throw new Error(`m or zkp do not match on the decrypted candidate result ${listId} ${candidateId}`)
      })
    })
  }
}

// Actions related to server side
class Server {
  constructor (pub) {
    this.pub = new she.PrecomputedPublicKey()
    this.pub.init(pub)
    this.urn = []
  }

  aggregateUrn () {
    return Shared.aggregateUrn(this.urn)
  }

  getMFromCypherTextAndRandomHistory (value) {
    const serverSideValueZero = this.pub.encG1(0, value.rh)
    const serverSideValueOne = this.pub.encG1(1, value.rh)
    if (serverSideValueZero.serializeToHexStr() === value.c.serializeToHexStr()) {
      return false
    }
    if (serverSideValueOne.serializeToHexStr() === value.c.serializeToHexStr()) {
      return true
    }
    throw new Error('Invalid list value')
  }

  /*
    Modified Benaloh challenge, the server will try to found
    if the client cypher text value is 1 or 0 using provided random histories
    Modified Benaloh challenge is currently a simple brute force by reproducing
    enc(1,rh) and enc(0,rh)
  */
  challenge (encryptedBallotWithRh) {
    Shared.verifyBallot(encryptedBallotWithRh, this.pub)
    const lists = Object.keys(encryptedBallotWithRh.lists).reduce((accLists, listId) => {
      const list = encryptedBallotWithRh.lists[listId]
      const candidates = Object.keys(list.candidates).reduce((accCandidates, candidateId) => {
        const candidate = list.candidates[candidateId]
        accCandidates[candidateId] = { value: this.getMFromCypherTextAndRandomHistory(candidate.value) }
        return accCandidates
      }, {})
      accLists[listId] = { value: this.getMFromCypherTextAndRandomHistory(list.value), candidates }
      return accLists
    }, {})
    return { lists }
  }

  registerBallot (encryptedBallot) {
    Shared.verifyBallot(encryptedBallot, this.pub)
    this.urn.push(encryptedBallot)
  }
}

(async () => {
  // Use NIST since we only need G1
  await she.init(she.NIST_P256, 1024, 2048)
  const sec = new she.SecretKey()
  sec.setByCSPRNG()
  const pub = sec.getPublicKey()
  const vote1 = {
    lists: {
      list1: {
        value: true,
        candidates: {
          candidate1: {
            value: true
          },
          candidate2: {
            value: true
          }
        }
      },
      list2: {
        value: false,
        candidates: {
          candidate3: {
            value: false
          },
          candidate4: {
            value: false
          }
        }
      }
    }
  }
  const vote2 = {
    lists: {
      list1: {
        value: true,
        candidates: {
          candidate1: {
            value: true
          },
          candidate2: {
            value: false
          }
        }
      },
      list2: {
        value: false,
        candidates: {
          candidate3: {
            value: false
          },
          candidate4: {
            value: false
          }
        }
      }
    }
  }
  const vote3 = {
    lists: {
      list1: {
        value: false,
        candidates: {
          candidate1: {
            value: false
          },
          candidate2: {
            value: false
          }
        }
      },
      list2: {
        value: true,
        candidates: {
          candidate3: {
            value: false
          },
          candidate4: {
            value: true
          }
        }
      }
    }
  }
  const server = new Server(pub)

  const client1 = new Client(pub, vote1, server)
  client1.vote()
  const client2 = new Client(pub, vote1, server)
  client2.vote()
  const client3 = new Client(pub, vote2, server)
  client3.vote()

  const client4 = new Client(pub, vote3, server)
  client4.challenge()
  client4.vote()

  const clients = [client1, client2, client3, client4]

  // Each client is able to verify ballot validity from the public urn
  clients.forEach((client) => {
    const urn = server.urn
    client.verifyBallot(urn[0])
    client.verifyBallot(urn[1])
    client.verifyBallot(urn[2])
    client.verifyBallot(urn[3])
  })

  // Server or client can aggregate the urn
  const urn = server.aggregateUrn()

  // Client decrypt the aggregated urn
  const decryptedUrn = client1.decryptAggregatedUrn(urn, sec)

  /*
    Each client can get the raw urn
    replay the aggregation and check with dec Zkps that
    the decrypted urn cypher texts, m, Zkps match the replay urn aggregation
  */
  clients.forEach((client) => {
    const urn = server.urn
    client.verifyDecryptedUrn(urn, decryptedUrn)
  })

  // We are done the vote is completely verified
})()
