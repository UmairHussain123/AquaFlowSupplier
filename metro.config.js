const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 */
module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  const {assetExts, sourceExts} = defaultConfig.resolver;

  return mergeConfig(defaultConfig, {
    transformer: {
      // SVGs are imported as components, not assets.
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      inlineRequires: true,
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
  });
})();
