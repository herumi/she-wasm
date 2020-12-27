module.exports = {
  entry: "./src/index-browser.js",
  mode: "production",
  output: {
    path: __dirname + '/',
    library: 'she',
    libraryTarget: 'umd',
    filename: 'she.js'
  },
/*
  resolve: {
    fallback: {
      path: false,
      fs: false,
      crypto: false,
    },
  },
*/
  target: "web"
};
