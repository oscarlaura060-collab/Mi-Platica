module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo ya resuelve los alias de tsconfig.json (@/*).
  return { presets: ['babel-preset-expo'] };
};
