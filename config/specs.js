const os = require('os')
const path = require('path')

const {getFlag, getString} = require('@jneander/dev-utils-node').cli

const webpack = require('./webpack.js')

const CHROME_FLAGS = [
  '--use-mock-keychain',
  '--no-default-browser-check',
  '--no-first-run',
  '--disable-default-apps',
  '--disable-popup-blocking',
  '--disable-translate',
  '--disable-extensions',
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--allow-file-access-from-files'
]

const pattern = getString('pattern', 'src/**/*.spec.js')

const files = [
  'spec-support/index.js',
  {
    pattern,
    watched: false
  }
]

const preprocessors = {
  'src/**/*.spec.js': ['webpack', 'sourcemap'],
  'spec-support/index.js': ['webpack', 'sourcemap']
}

const browsers = []
if (getFlag('no-headless')) {
  browsers.push('CustomChrome')
} else {
  browsers.push('CustomChromeHeadless')
}

module.exports = function configure(config) {
  const packageName = path.basename(path.join(__dirname, '..'))

  config.set({
    basePath: path.join(__dirname, '..'),

    /*
     * Make the karma-browser exchange more forgiving to avoid
     * premature disconnects and build failures.
     */
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 60000,

    browsers,

    /*
     * If the browser does not capture in given timeout (ms),
     * terminate the process.
     */
    captureTimeout: 30000,

    client: {
      mocha: {
        slow: 500,
        timeout: 1000
      }
    },

    colors: true,

    customLaunchers: {
      CustomChrome: {
        base: 'Chrome',

        flags: CHROME_FLAGS
      },

      CustomChromeHeadless: {
        base: 'Chrome',

        flags: CHROME_FLAGS.concat([
          '-incognito',
          '--headless',
          '--disable-gpu',
          '--remote-debugging-port=9222'
        ])
      }
    },

    failOnEmptyTestSuite: false,
    files,
    frameworks: ['mocha', 'webpack'],
    logLevel: config.LOG_INFO,
    port: 9876,
    preprocessors,
    reporters: ['spec'],

    webpackServer: {
      noInfo: true
    },

    webpack: {
      ...webpack,

      output: {
        path: path.join(os.tmpdir(), `${packageName}_specs_${Date.now()}`)
      }
    }
  })
}
