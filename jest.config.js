module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-redux$': '<rootDir>/node_modules/react-redux/dist/cjs/index.js',
    '^immer$': '<rootDir>/node_modules/immer/dist/cjs/index.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Most of the RN ecosystem ships untranspiled ESM, so it has to go through
  // Babel rather than being skipped as a node_module.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|@react-native-community|@react-navigation|@reduxjs|react-native|react-redux|redux-persist)[/-])',
  ],
};
