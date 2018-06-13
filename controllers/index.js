'use strict';

//contrib
var express = require('express');
var router = express.Router();
// var jwt = require('express-jwt');

// //mine
// var config = require('../../config');

router.use('/auth', require('./auth'));
router.use('/configs', require('./configs'));
router.use('/processes', require('./processes'));
router.use('/exposures', require('./exposures'));
router.use('/headers', require('./headers'));
router.use('/searches', require('./searches'));

module.exports = router;
