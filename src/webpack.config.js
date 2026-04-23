module.exports = {
  // Outros campos do Webpack
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false, // Resolve questões de dependências relacionadas ao 'fs'
    },
  },
};
