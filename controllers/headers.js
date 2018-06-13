'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');

//mine
var config = require('../../imagex-config/api/config.js')(winston);
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

/**
 * @api {post} /headers/ Create
 * @apiName Create
 * @apiDescription Register a new Header in the database
 * @apiGroup Headers
 *
 * @apiParam {Date} [dateAdded=Date.now()] Date added
 * @apiParam {String} exposureId ObjectId of source image
 * @apiParam {Object[]} keys Array of Key-Value-Comment sets
 * @apiParam {String} keys.key Key Name
 * @apiParam {Mixed} keys.value Key Value
 * @apiParam {String} [keys.comment] Key Comment
 *
 * @apiSuccess (200) {String} _id ObjectId of created Header
 */
router.post('/', function(req, res, next) {
    console.log(req.body);
    db.Header.create(req.body, function(err, _hdr){
        if(err) {
            console.log(err);
            return res.status(403).json(err);
        }
        logger.info('created new Header: %s', _hdr._id);
        return res.json(_hdr._id);
    });
});

/**
 * @api {post} /headers/find Find
 * @apiName Find
 * @apiDescription Get a filtered list of Headers
 * @apiGroup Headers
 *
 * @apiParam {Object} [q] JSON query to pass to mongo
 * @apiParam {Object} [c] Perform coordinate search.  Needs ra, dec, radius, and radunit defined.
 *
 * @apiSuccess (200) {Object[]} headers List of Headers
 */
router.post('/find', function(req, res, next) {
    var q = req.body.q !== undefined ? req.body.q : {};
    var c = req.body.c !== undefined ? req.body.c : {};
    console.log(q);
    console.log(c);
    if(Object.keys(c).length !== 0) {
        console.log('in here');
        var dist = c.radius * 3.14159 / 180.0;
        db.Exposure.find(
            { loc:
                {$geoWithin :
                    {$centerSphere : [[ c.ra - 180.0, c.dec], dist]}
                }
            }).exec(function (err, _eids){
                if(q.$and !== undefined){
                    q.$and.push({'exposureId' : {$in : _eids}});
                } else {
                    q = {'exposureId' : {$in : _eids}};
                }
                db.Header.find(q).populate('exposureId').exec(function (err, _hdrs) {
                    if (err) return next(err);
                    return res.json(_hdrs);
                });
        });
    } else {
        db.Header.find(q).populate('exposureId').exec(function (err, _hdrs) {
            if (err) return next(err);
            return res.json(_hdrs);
        });
    }
});

/**
 * @api {get} /headers/:id Find By ID
 * @apiName FindById
 * @apiDescription Return a single Header Set
 * @apiGroup Headers
 *
 * @apiParam {String} id Header ID
 *
 * @apiSuccess (200) {Object} header Header Record (if found)
 */
router.get('/:hdr_id', function(req, res, next) {
    db.Header.findById(req.params.hdr_id).exec(function (err, _h) {
        if (err) return next(err);
        if (!_h) return res.status(404).json({message: "no such Header:" + req.params.hdr_id});
        return res.json(_h);
    });
});


/**
 * @api {delete} /headers/:id Delete By ID
 * @apiName DeleteById
 * @apiDescription Remove a single header and its associated exposure
 * @apiGroup Headers
 *
 * @apiParam {String} id Header ID
 *
 * @apiSuccess (200) {String} status 'ok' if objected removed
 */
router.delete('/:hdr_id', function(req, res, next) {
    db.Header.findByIdAndRemove(req.params.hdr_id).exec(function (err, _h) {
        logger.info("IN HERE");
        logger.info(_h);
        if (err) return next(err);
        db.Exposure.findByIdAndRemove(_h.exposureId).exec(function (err, _e) {
            if (err) return next(err);
            return res.json({ status : 'ok'});
        })
    });
});


/**
 * @api {get} /headers/list/keys/ List Unique Keys
 * @apiName Keys
 * @apiDescription Returns a list of unqiue registered keys
 * @apiGroup Headers
 *
 * @apiSuccess (200) {String} status 'ok' if list generated
 * @apiSuccess (200) {JSON} keys List of unique keys
 */
router.get('/list/keys', function(req, res, next) {
    db.Header.aggregate([
        {$project:
            {keys: {$objectToArray: "$keys"}}
        },
        {$unwind:"$keys"},
        {$group:
            {
            _id:null,
            keys:{$addToSet:"$keys.k"}
            }
        }]).exec(function (err, _keys) {
            if (err) return next(err);
            return res.json({status: 'ok', keys:_keys[0].keys});
    });
});


////////EXPORT///////

module.exports = router;