# browser demo

How to build `browser/she.js`.
```
cd browser
pnpm add -D webpack webpack-cli
pnpm webpack
python3 -m http.server
```


# cross tabulation demo

`cross-demo.html` is a demo of cross tabulation on encrypted data. The design note is `cross-demo-plan.md` (in Japanese). `cross-schema.js` / `cross-user.js` / `cross-cloud.js` / `cross-analyst.js` hold the data and the cryptography of each role and `cross-ui.js` wires them to the DOM. The page switches between English and Japanese by the top-right button (`lang.js`).
