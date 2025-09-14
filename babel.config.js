// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      "@babel/preset-typescript", // <-- make sure TSX is transformed
      ["@babel/preset-react", { runtime: "automatic" }],
    ],
  };
};
