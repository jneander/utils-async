const {configureEslint} = require('@jneander/dev-lint')

module.exports = configureEslint({
  browser: true
})

module.exports.overrides.push({
  env: {
    node: true
  },

  files: ['./config/**/*.js', './scripts/**/*.js']
})
