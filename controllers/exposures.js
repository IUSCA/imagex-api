'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');
var mongoose = require('mongoose');

//mine
var config = require('../../imagex-config/api/config.js')(winston);
const common = require('../common');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

/**
 * @api {post} /exposures/ Create
 * @apiName Create
 * @apiDescription Register a new Exposure in the database
 * @apiGroup Exposures
 *
 * @apiParam {Date} [dateAdded=Date.now()] Date added
 * @apiParam {String} filename Original filename
 * @apiParam {String} filter Filter used to obtain image
 * @apiParam {Number} size Size of image on disk
 * @apiParam {Number} height height in pixels
 * @apiParam {Number} width width in pixels
 * @apiParam {Array[]} corners Array of RA/DEC pairs of the 4 image corners
 * @apiParam {Number} [ra0] Top left RA coordinate
 * @apiParam {Number} [dec0] Top right DEC coordinate
 * @apiParam {Number} pixelscale Image pixelscale in arcsec/pixel
 * @apiParam {String} [group] ObjectId of group owner
 * @apiParam {String} [owner] ObjectId of Exposure owner
 *
 * @apiSuccess (200) {String} _id ObjectId of created Exposure
 */
router.post('/', function(req, res, next) {
    console.log(req.body);
    db.Exposure.create(req.body, function(err, _exp){
        if(err) {
            console.log(err);
            return res.status(403).json(err);
        }
        logger.info('created new Exposure: %s', _exp._id);
        return res.json(_exp._id);
    });
});

/**
 * @api {post} /exposures/find Find
 * @apiName Find
 * @apiDescription Get a filtered list of Exposures
 * @apiGroup Exposures
 *
 * @apiParam {String} [q] JSON query to pass to mongo
 * @apiParam {String} [jwt] JSON Web Token
 *
 * @apiSuccess (200) {Object[]} exposures List of Exposures
 */
router.post('/find', function(req, res, next) {
    var q = req.body.q !== undefined ? req.body.q : {};
    db.Exposure.find(q).exec(function (err, _exps) {
        if (err) return next(err);
        return res.json(_exps);
    });
});

/**
 * @api {get} /exposures/:id Find By ID
 * @apiName FindById
 * @apiDescription Return a single Exposure
 * @apiGroup Exposures
 *
 * @apiParam {String} id Exposure ID
 *
 * @apiSuccess (200) {Object} exposure Exposure Record (if found)
 */
router.get('/:exp_id', function(req, res, next) {
    db.Exposure.findById(req.params.proc_id).exec(function (err, _e) {
        if (err) return next(err);
        if (!_e) return res.status(404).json({message: "no such Exposure:" + req.params.exp_id});
        return res.json(_e);
    });
});

/**
 * @api {get} /exposures/data/:userId Total Data Usage By userId
 * @apiName DataById
 * @apiDescription Return the total number and amount in bytes of files uploaded and owned by this user
 * @apiGroup Exposures
 *
 * @apiParam {String} userId User ID string
 *
 * @apiSuccess (200) {String} _id UserId requested
 * @apiSuccess (200) {Number} files Number of files
 * @apiSuccess (200) {Number} bytes Disk usage in bytes
 */
router.get('/data/:userId', function(req, res, next) {
    console.log('in here data');
    db.Exposure.aggregate([
            {$match: {'owner': new mongoose.Types.ObjectId(req.params.userId)}},
            { $group: {
                _id: "$owner",
                bytes: {$sum: "$size"},
                files: {$sum: 1}
            }}
            ]).exec(function (err, _d) {
                console.log(_d);
        if (err) return next(err);
        if (!_d) return res.status(404).json({message: "no such user or user has no data:" + req.params.userId});
        return res.json(_d[0]);
    });
});



////////EXPORT///////

module.exports = router;