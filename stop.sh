#!/bin/sh

cd $(dirname $0) && ./node_modules/.bin/forever list && ./node_modules/.bin/forever stop 'tagmazing'
