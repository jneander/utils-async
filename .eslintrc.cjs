/*
 * For reference:
 * https://eslint.org/docs/user-guide/configuring
 */

module.exports = {
  env: {
    browser: true,
    es2020: true,
    mocha: true,
    node: true
  },

  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:eslint-comments/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },

  plugins: ['prettier', '@typescript-eslint'],
  root: true,

  rules: {
    'eslint-comments/no-unused-disable': 'error',
    'import/extensions': ['error', 'ignorePackages', {ts: 'never'}],
    'import/no-extraneous-dependencies': ['error', {devDependencies: true}],
    'prettier/prettier': 'error',
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}]
  }
}
