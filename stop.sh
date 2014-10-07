#!/bin/sh

cd $(dirname $0) && ./node_modules/forever/bin/forever list && ./node_modules/forever/bin/forever stop 'tagmazing'
