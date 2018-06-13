'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');

//mine
var config = require('../../imagex-config/api/config.js')(winston);
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');


//check if config entry exists and create it from the default options if it doesn't
db.Config.findOne({}).exec(function (err, _c) {
    console.log('Config entry: ', _c);
    if (err || _c == null) {
        logger.error('Config entry not found in db, inserting default config!');
        db.Config.create({
            site_config : config.default_site_options
        }, function(err, _c){
            if(err) {
                logger.error('Could not create default config entry!');
            }
            logger.info('created new config entry: %s', _c._id);
        });
    }
});


/**
 * @api {get} /configs Get site config
 * @apiName GetAll
 * @apiDescription Returns the current site configuration
 * @apiGroup Config
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 * @apiSuccess (200) {Object} config Site configuration
 */
router.get('/', function(req, res, next) {
    db.Config.findOne({}).exec(function (err, _c) {
        if (err) return next(err);
        if (!_c) return res.status(404).json({message: "no config found!"});
        return res.json({status: "ok", config: _c.site_config});
    });
});

/**
 * @api {patch} /configs Update
 * @apiName Update
 * @apiDescription Update site config
 * @apiGroup Config
 *
 * @apiParam {Misc} [multiple] Update config object
 *
 * @apiSuccess (200) {String} status Returns 'ok' if update was successful
 */
router.patch('/', function(req, res, next) {
    console.log(req.body);
    db.Config.findOne({}).exec(function (err, _c) {
        if (err) return next(err);
        if (!_c) return res.status(404).json({message: "no config found!"});
        _c.site_config = req.body;
        _c.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});


////////EXPORT///////

module.exports = router;