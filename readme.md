[![Build Status](https://github.com/herumi/she-wasm/actions/workflows/main.yml/badge.svg)](https://github.com/herumi/she-wasm/actions/workflows/main.yml)

# Two-level homomorphic encryption for Node.js by WebAssembly

# Abstract

This library supports two kinds of lifted ElGamal encryption,
- which can add two ciphertexts many times, and
- can multiply two ciphertexts once.

For two vectors x = (x1, ..., xn) and y = (y1, ..., yn),
EncG1(x1) * EncG2(y1) + ... + EncG1(xn) * EncG2(yn) = EncGT(x1 * y1 + ... + xn * yn).

see [mcl](https://github.com/herumi/mcl)

# News
- 2023/Sep/06 The performance of enc/dec is a little improved.
- 2023/Aug/17 The performance of dec is a little improved.
- 2022/Jul/20 v1.0.0
- 2020/Dec/27 change file layout
- 2020/Dec/18 `sec.decWithZkpDec(c, aux)` returns `[m, zkp]` that `zkp` proves `dec(c) = m` for CipherTextGT c, and `aux.verify(c, zkp, m)` returns the correctness where `aux = pub.getAuxiliaryForZkpDecGT()`.
- 2020/Nov/06 `sec.decWithZkpDec(c, pub)` returns `[m, zkp]` that `zkp` proves `dec(c) = m` for CipherTextG1 c, and `pub.verify(c, zkp, m)` returns the correctness.

# Demo

* [cross tabulation demo](https://herumi.github.io/she-wasm/browser/cross-demo.html)
* [cross tabulation demo (Japanese)](https://herumi.github.io/she-wasm/browser/cross-demo-ja.html)

# for Node.js

```
node test
```

# How to use

The version `v0.7.0` breaks backward compatibility of the entry point.

- Node.js : `const she = require('she-wasm')`
- React : `const she = require('she-wasm/browser')`
- HTML : `<script src="https://herumi.github.io/she-wasm/browser/she.js"></script>`

# Doc
* [_Efficient Two-level Homomorphic Encryption in Prime-order Bilinear Groups and A Fast Implementation in WebAssembly_](https://dl.acm.org/citation.cfm?doid=3196494.3196552), N. Attrapadung, G. Hanaoka, S. Mitsunari, Y. Sakai,
K. Shimizu, and T. Teruya. ASIACCS 2018
* [slide for ASIA CCS 2018 in English](https://www.slideshare.net/herumi/efficient-twolevel-homomorphic-encryption-in-primeorder-bilinear-groups-and-a-fast-implementation-in-webassembly)
* [slide for SCIS 2018 in Japanese](https://www.slideshare.net/herumi/2scis2018)
* [she-api](https://github.com/herumi/mcl/blob/master/misc/she/she-api.md)
* [she-api(Japanese)](https://github.com/herumi/mcl/blob/master/misc/she/she-api-ja.md)

# How to build
Install [Emscripten](https://emscripten.org/).

```
git submodule update --init --resurcive
cd src
make
```

# License

modified new BSD License
http://opensource.org/licenses/BSD-3-Clause

# Author

MITSUNARI Shigeo(herumi@nifty.com)

# Sponsors welcome
[GitHub Sponsor](https://github.com/sponsors/herumi)
