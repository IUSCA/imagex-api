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
 * @api {post} /processes/ Create
 * @apiName Create
 * @apiDescription Create a new process
 * @apiGroup Processes
 *
 * @apiParam {String} name Process Name
 * @apiParam {String} status="NEW" Single word status
 * @apiParam {number{0-1.0}} progress=0 Fraction complete
 * @apiParam {String} [parentID] ObjectId of parent process
 * @apiParam {String} [refID] ObjectId of referral object
 * @apiParam {String} [owner] ObjectId of process owner
 *
 * @apiSuccess (200) {String} _id ObjectId of created Process
 */
router.post('/', function(req, res, next) {
    console.log(req.body);
    db.Process.create(req.body, function(err, _p){
        if(err) {
            console.log(err);
            return res.status(403).json(err);
        }
        logger.info('created new process: %s', _p._id);
        return res.json(_p._id);
    });
});

/**
 * @api {get} /processes/ Find
 * @apiName Find
 * @apiDescription Get a filtered list of processes
 * @apiGroup Processes
 *
 * @apiParam {String} [q] JSON query to pass to mongo
 *
 * @apiSuccess (200) {Object[]} processes List of processes
 */
router.get('/', function(req, res, next) {
    var q = req.query.q !== undefined ? JSON.parse(decodeURIComponent(req.query.q)) : {};
    db.Process.find(q).exec(function (err, _procs) {
        if (err) return next(err);
        return res.json(_procs);
    });
});

/**
 * @api {get} /processes/:id Find By ID
 * @apiName FindById
 * @apiDescription Return a single process
 * @apiGroup Processes
 *
 * @apiParam {String} id process ID
 *
 * @apiSuccess (200) {Object} process Process (if found)
 */
router.get('/:proc_id', function(req, res, next) {
    if(req.params.proc_id === undefined) return next();
    db.Process.findById(req.params.proc_id).exec(function (err, _p) {
        if (err) return next(err);
        if (!_p) return res.status(404).json({message: "no such process:" + req.params.proc_id});
        return res.json(_p);
    });
});

/**
 * @api {patch} /processes/:id Update
 * @apiName Update
 * @apiDescription Lookup and update the status of a process
 * @apiGroup Processes
 *
 * @apiParam {String} id process ID
 * @apiParam {String} status Process status
 * @apiParam {number{0-1.0}} progress Fraction complete
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 */
router.patch('/:proc_id', function(req, res, next) {
    db.Process.findById(req.params.proc_id).exec(function (err, _p) {
        if (err) return next(err);
        if (!_p) return res.status(404).json({message: "no such process:" + req.params.proc_id});
        _p.progress = req.body.progress;
        _p.status = req.body.status;
        if(req.body.ended_at != undefined) {
            _p.ended_at = req.body.ended_at;
        } else {
            _p.last_updated = Date.now();
        }
        _p.save(function(err) {
            if (err) return (err);
            res.json({status: "ok"});
        });
    });
});

/**
 * @api {delete} /processes/:id Delete
 * @apiName Delete
 * @apiDescription Delete a process
 * @apiGroup Processes
 *
 * @apiParam {String} id process ID
 *
 * @apiSuccess (200) {String} status Returns 'ok' if successful
 */
router.delete('/:proc_id', function(req, res, next) {
    db.Process.findByIdAndRemove( req.params.proc_id, function (err, _proc) {
        if (err) return next(err);
        return res.json({status: "ok"});
    });
});


////////EXPORT///////

module.exports = router;