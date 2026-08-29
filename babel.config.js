module.exports = function (api) {
  api.cache(false);

  const plugins = [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        // A missing key resolves to undefined instead of throwing at build time,
        // so Config.tsx's fallback URL can do its job.
        allowUndefined: true,
      },
    ],
  ];

  if (
    process.env.BABEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  ) {
    plugins.push('react-native-paper/babel');
  }

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
