'use strict';

var express = require('express');
var controller = require('./file.controller');

var router = express.Router();

router.post('/upload', controller.upload);

module.exports = router;