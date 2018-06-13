'use strict';

//node
var fs = require('fs');
var path = require('path');

//contrib
var express = require('express');
var winston = require('winston');
const jsonwt = require('jsonwebtoken');
var request = require('request');
// var ejs = require('ejs');

//mine
var config = require('../imagex-config/api/config.js')(winston);
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

var router = express.Router();

///////////////JSON WEB TOKEN//////////////
///////////////////////////////////////////

exports.issue_jwt = function(user, cb) {
    console.log("issuing!");
    var claim = {
        iss: config.auth.iss,
        exp: (Date.now() + config.auth.ttl)/1000,
        profile: {
            name: user.name,
            roles: user.roles,
            id: user._id,
            quota: user.quota
        }
    };
    console.log( jsonwt.sign(claim, config.auth.secret));
    cb(null, jsonwt.sign(claim, config.auth.secret));
}

exports.check_jwt = function(req, res, next) {
    if(req.query.jwt === undefined) {
        res.sendStatus("403"); //FORBIDDEN
        return;
    }

    var decoded = jsonwt.verify(req.query.jwt, config.auth.secret);

    if(decoded === undefined){
        res.sendStatus("403"); //FORBIDDEN
        return;
    } else {
        next();
    }
}

exports.admin_only = function(req, res, next) {

    var decoded = jsonwt.verify(req.query.jwt, config.auth.secret);

    if(decoded.profile.roles !== undefined && decoded.profile.roles.indexOf('admin') > -1) {
        next();
    } else {
        res.sendStatus("403"); //FORBIDDEN
        return;
    }
};

