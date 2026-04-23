module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
        exclude: [
          /node_modules\/react-datepicker/, // ⛔️ ignora o source-map desse pacote
        ],
      },
    ],
  },
};
