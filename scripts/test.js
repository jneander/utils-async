#!/usr/bin/env node

const path = require('path')

const {getFlag, getString} = require('@jneander/dev-utils-node').cli
const {buildCommand, runCommandSync} = require('@jneander/dev-utils-node').commands

const args = ['start']

if (getFlag('watch')) {
  args.push('--no-single-run')
} else {
  args.push('--single-run', '--no-auto-watch')
}

if (getFlag('no-headless')) {
  args.push('--no-headless')
}

const pattern = getString('pattern')
if (pattern) {
  args.push('--pattern', pattern)
}

const configPath = path.join(__dirname, '../config/specs.js')
args.push(configPath)

process.exit(
  runCommandSync(
    buildCommand('karma', args, {
      NODE_ENV: 'test',
      NODE_OPTIONS: '--max_old_space_size=4096'
    })
  ).status
)
