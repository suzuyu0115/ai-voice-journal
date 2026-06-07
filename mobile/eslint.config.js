const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'ios/', 'android/', '.expo/'],
  },
]);
