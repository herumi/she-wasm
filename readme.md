# Two-level homomorphic encryption for Node.js by WebAssembly

# Abstract

see [mcl](https://github.com/herumi/mcl) and [she demo on browser](https://herumi.github.io/she-wasm/she-demo.html)

# for Node.js
node test.js

# How to build
Install [emsdk](https://github.com/juj/emsdk.git)

```
mkdir work
cd work
git clone git@github.com:herumi/mcl
git clone git@github.com:herumi/cybozulib
git clone git@github.com:herumi/she-wasm
cd mcl
make ../she-wasm/she_c.js
```

# License

modified new BSD License
http://opensource.org/licenses/BSD-3-Clause

# Author

光成滋生 MITSUNARI Shigeo(herumi@nifty.com)
