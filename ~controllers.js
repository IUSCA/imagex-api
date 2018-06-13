'use strict';

//node
var fs = require('fs');
var path = require('path');

//contrib
var express = require('express');
var winston = require('winston');
const jsonwt = require('jsonwebtoken');
var request = require('request');
var ejs = require('ejs');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var db = require('./models');

var router = express.Router();

///////////////JSON WEB TOKEN//////////////
///////////////////////////////////////////

function issue_jwt(user, cb) {
    console.log("issuing!");
    var claim = {
        iss: config.auth.iss,
        exp: (Date.now() + config.auth.ttl)/1000,
        profile: {
            username: user
        }
    };
    console.log( jsonwt.sign(claim, config.auth.secret));
    cb(null, jsonwt.sign(claim, config.auth.secret));
}

function check_jwt(req, res, next) {
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

///////////////IU CAS//////////////////////
///////////////////////////////////////////

router.get('/verify', function(req, res, next) {
    var ticket = req.query.casticket;

    if(!req.headers.referer) return next("Referer not set in header..");
    var casurl = req.headers.referer;
    request({
        url: 'https://cas.iu.edu/cas/validate?cassvc=IU&casticket='+ticket+'&casurl='+casurl,
        timeout: 1000*5, //long enough?
    }, function (err, response, body) {
        if(err) return next(err);
        logger.debug("verify responded", response.statusCode, body);
        if (response.statusCode == 200) {
            var reslines = body.split("\n");
            console.log(reslines);
            if(reslines[0].trim() == "yes") {
                var uid = reslines[1].trim();

                if(config.auth.whitelist.includes(uid)) {
                    logger.debug("IUCAS is valid, user is admin. IU id:" + uid);
                    issue_jwt(uid, function (err, jwt) {
                        if (err) return next(err);
                        console.log("issued token", jwt);
                        res.json({jwt: jwt, uid: uid, role: 'admin'});
                    });
                } else {
                    logger.error("IUCAS is valid, but user is not admin");
                    issue_jwt(uid, function (err, jwt) {
                        if (err) return next(err);
                        console.log("issued token", jwt);
                        res.json({jwt: jwt, uid: uid, role: 'user'});
                    });
                }
            } else {
                logger.error("IUCAS failed to validate");
                res.sendStatus("403");//Is 403:Forbidden appropriate return code?
            }
        } else {
            //non 200 code...
            next(body);
        }
    })
});


//////////////////////Exposures/////////////////
////////////////////////////////////////////////

//get Exposures
router.get('/exposures', function(req, res, next) {
    db.Exposure.find({}, function(err, exposures){
        if(err){
            console.log(err);
            next();
        } else{
            res.json(exposures);
            console.log('retrieved all exposures ', exposures.length);
        }
    })
});

//create Exposure
//TODO add acl middleware
router.post('/exposures', function(req, res, next) {
    db.Exposure.create(req.body, function(err, _exp){
        if(err) return res.status(403).json({message:"could not create new exposure"});
        logger.info('created new exposure: %s', _exp._id);
        return res.json(_exp);
    });
});

//create Header
//TODO add acl middleware
router.post('/headers', function(req, res, next) {
    db.Header.create(req.body, function(err, _hdr){
        if(err) return res.status(403).json({message:"could not create new header"});
        logger.info('created new header: %s', _hdr._id);
        return res.json(_hdr);
    });
});

//////////////PROCESS////////////

//CREATE
router.post('/processes', function(req, res, next) {
    console.log(req.body);
    db.Process.create(req.body, function(err, _p){
        if(err) {
            console.log(err);
            return res.status(403).json(err);
        }
        logger.info('created new process: %s', _p._id);
        return res.json(_p);
    });
});

//READ
router.get('/processes', function(req, res, next) {
    var q = req.query.q !== undefined ? JSON.parse(decodeURIComponent(req.query.q)) : {};
    db.Process.find(q).exec(function (err, _procs) {
        if (err) return next(err);
        return res.json(_procs);
    });
});

router.get('/processes/:proc_id', function(req, res, next) {
    db.Process.findById(req.params.proc_id).exec(function (err, _p) {
        if (err) return next(err);
        if (!_p) return res.status(404).json({message: "no such process:" + req.params.proc_id});
        return res.json(_p);
    });
});

//UPDATE
router.patch('/processes/:proc_id', function(req, res, next) {
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

//DELETE
router.delete('/processes/:proc_id', function(req, res, next) {
    db.Process.findByIdAndRemove( req.params.proc_id, function (err, _proc) {
        if (err) return next(err);
        return res.json({status: "ok"});
    });
});


// //delete person
// router.post('/delete/:person_id', check_jwt, function(req, res, next) {
//     db.Person.findByIdAndRemove(req.params.person_id, function(err, person) {
//         if (err) return next(err);
//         logger.info('Removing person: %s', person._id);
//         return res.json({status: "ok"});
//     });
// });
//
// //update person
// router.post('/update/:person_id', check_jwt, function(req, res, next) {
//
//     db.Person.findById(req.params.person_id).exec(function (err, person) {
//         if (err) return next(err);
//         if (!person) return res.status(404).json({message: "no such person:" + req.params.person_id});
//         person = req.body.person;
//         person.save(function(err) {
//             if (err) return (err);
//             res.json({status: "ok"});
//         });
//     });
// });


//////////////EXPORT////////////

module.exports = router;
