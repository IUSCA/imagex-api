'use strict';

//contrib
var express = require('express');
var router = express.Router();
var winston = require('winston');

//mine
var config = require('../../imagex-config/api/config.js')(winston);
var const = require('../common');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');

/**
 * @api {post} /searches/ Create
 * @apiName Create
 * @apiDescription Create a new search field
 * @apiGroup Search
 *
 * @apiParam {String} jwt JSON web token
 * @apiParam {String} field Search field
 * @apiParam {String} label Label
 * @apiParam {String} type Search type
 * @apiParam {Boolean} active=1 Search field active?
 * @apiParam {String} [units] Units used (paired with label)
 * @apiParam {Number} [min] Minimum value (used to limit range searches)
 * @apiParam {Number} [max] Maximum value (used to limit range searches)
 * @apiParam {String} [placeholder] Placeholder text
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 * @apiSuccess (200) {String} id ID of created field
 */
router.post('/', common.check_jwt, common.admin_only, function(req, res, next) {
    console.log(req.body);
    db.Search.create(req.body, function(err, _s){
        if(err) {
            console.log(err);
            return res.status(403).json(err);
        }
        logger.info('created new search field: %s', _s._id);
        return res.json({status: "ok", id: _s._id});
    });
});

/**
 * @api {get} /searches/ Find
 * @apiName Find
 * @apiDescription Get a filtered list of search fields
 * @apiGroup Search
 *
 * @apiParam {Boolean} [active] Return active/inactive fields.  Omit to return all fields.
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 * @apiSuccess (200) {Object[]} fields List of search fields
 */
router.get('/', function(req, res, next) {
    var q = req.query.active !== undefined ? {'active': req.query.active} : {};
    db.Search.find(q).exec(function (err, _fields) {
        if (err) return next(err);
        return res.json({status: "ok", fields: _fields});
    });
});

/**
 * @api {get} /searches/:id Find By ID
 * @apiName FindById
 * @apiDescription Return a single search field
 * @apiGroup Search
 *
 * @apiParam {String} id search ID
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 * @apiSuccess (200) {Object} field Search field (if found)
 */
router.get('/:search_id', function(req, res, next) {
    db.Search.findById(req.params.search_id).exec(function (err, _s) {
        if (err) return next(err);
        if (!_s) return res.status(404).json({message: "no such search field:" + req.params.proc_id});
        return res.json({status: "ok", field: _s});
    });
});

/**
 * @api {patch} /searches/:id Update
 * @apiName Update
 * @apiDescription Lookup and update a search field
 * @apiGroup Search
 *
 * @apiParam {String} id Search Field ID
 * @apiParam {String} jwt JSON web token
 * @apiParam {Misc} [multiple] Field property to update. See CREATE api for available properties
 *
 * @apiSuccess (200) {String} status Returns 'ok' if update was successful
 */
router.patch('/:search_id', common.check_jwt, common.admin_only, function(req, res, next) {
    console.log(req.body);
    db.Search.findById(req.params.search_id).exec(function (err, _s) {
        if (err) return next(err);
        if (!_s) return res.status(404).json({message: "no such search field:" + req.params.proc_id});
        console.log(_s._doc);
        Object.keys(_s._doc).forEach(function(p){
            console.log(p);
            if(req.body[p] !== undefined) {
                _s[p] = req.body[p];
            }
        })
        _s.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});

/**
 * @api {delete} /searches/:id Delete
 * @apiName Delete
 * @apiDescription Delete a search field
 * @apiGroup Search
 *
 * @apiParam {String} id Search field ID
 * @apiParam {String} jwt JSON web token
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 */
router.delete('/:search_id', common.check_jwt, common.admin_only, function(req, res, next) {
    db.Search.findByIdAndRemove( req.params.search_id, function (err, _s) {
        if (err) return next(err);
        return res.json({status: "ok"});
    });
});


////////EXPORT///////

module.exports = router;
