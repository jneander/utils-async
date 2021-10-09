#!/usr/bin/env sh

yarn install
yarn bootstrap
yarn build:all
yarn test:all
