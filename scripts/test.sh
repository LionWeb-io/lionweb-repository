#!/usr/bin/env bash
set -e

yarn build
# start server
yarn dev &

yarn test
