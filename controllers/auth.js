//Adapted from SCA-auth local module

//contrib
const express = require('express');
const router = express.Router();
const passport = require('passport');
const passport_localst = require('passport-local').Strategy;
const winston = require('winston');
const nodemailer = require('nodemailer');
const uuid = require('uuid');
// const jwt = require('express-jwt');

//mine
var config = require('../../imagex-config/api/config.js')(winston);
const logger = new winston.Logger(config.logger.winston);
const common = require('../common');
const db = require('../models');


passport.use(new passport_localst(
    function(username, password, done) {
        db.User.findOne({where: {$or: {"username": username, "email": username }}}).then(function(user) {
            if (!user) {
                return done(null, false, { message: 'Incorrect email or username' });
            } else {
                //var err = user.check();
                //if(err) return done(null, false, err);
                if(!user.password_hash) {
                    return done(null, false, { message: 'Password login is not enabled for this account' });
                }
                if(!user.isPassword(password)) {
                    //delay returning to defend against password sweeping attack
                    setTimeout(function() {
                        done(null, false, { message: 'Incorrect password' });
                    }, 2000);
                    return;
                }
                done(null, user);
            }
        });
    }
));

//create default admin and guest users if they don't exist
db.User.register(new db.User({
    username: config.auth.admin.email,
    name: config.auth.admin.name,
    email: config.auth.admin.email,
    confirmed: true
}), config.auth.admin.default_password, function(err, user) {
    if (err) {
        logger.error('Admin account either exists or could not be created');
    } else {
        user.roles.push("admin");
        user.roles.push("user");
        user.save();
        logger.warn('Admin account created with default password. Recommend changing this immediately.');
    }
});

db.User.register(new db.User({
    username: config.auth.guest.email,
    name: config.auth.guest.name,
    email: config.auth.guest.email,
    confirmed: true
}), config.auth.guest.default_password, function(err, user) {
    if (err) {
        logger.error('Guest account either exists or could not be created');
    } else {
        user.roles = [];
        user.roles.push("guest");
        user.save();
        logger.info('Guest account created with default password.');
    }
});


function do_send_email_confirmation(url, user, cb) {
    var fullurl = url+"#!/confirm/"+user.id+"/"+user.confirmation_token;

    var transporter = nodemailer.createTransport();

    logger.info("transporter created");
    transporter.sendMail({
        from: config.local.email_confirmation.from,
        to: user.email,
        subject: config.local.email_confirmation.subject,
        text: "Hello!\n\nIf you have created a new account, please visit following URL to confirm your email address.\n\n"+ fullurl,
        //html:  ejs.render(html_template, params),
    }, function(err, info) {
        if(err) return cb(err);
        if(info && info.response) logger.info("notification sent: "+info.response);
        cb();
    });
}

function send_email_confirmation(url, user, cb) {
    //need to generate token if it's not set yet
    if(!user.confirmation_token) {
        user.confirmation_token = uuid.v4();
        user.save().then(function() {
            do_send_email_confirmation(url, user, cb);
        });
    } else {
        do_send_email_confirmation(url, user, cb);
    }
}

function send_resetemail(url, user, cb) {
    var transporter = nodemailer.createTransport();
    var fullurl = url+"#!/forgotpass/"+user.password_reset_token;
    transporter.sendMail({
        from: config.local.email_passreset.from,
        to: user.email,
        subject: config.local.email_passreset.subject,
        text: "Hello!\n\nIf you have requested to reset your password, please visit "+fullurl+" to reset your password (using the same browser you've used to send the request",
    }, function(err, info) {
        if(err) return cb(err);
        if(info && info.response) logger.info("notification sent: "+info.response);
        cb();
    });
}

// router.post('/register', function(req, res, next) {
//     console.log('registering user');
//     db.User.register(new db.User({username: req.body.username}), req.body.password, function(err) {
//         if (err) {
//             console.log('error while user register!', err);
//             return next(err);
//         }
//
//         console.log('user registered!');
//
//         res.redirect('/');
//     });
// });

router.post('/register', function(req, res, next) {
    console.log('registering user');
    db.User.register(new db.User({username: req.body.email, name: req.body.name, email: req.body.email, roles: ['user'], quota: config.auth.quota, confirmed: false}), req.body.password, function(err, user) {
        if (err) {
            console.log('error while user register!', err);
            return next(err);
        }
        send_email_confirmation(config.local.url, user, function(){
            res.json({message: "Registration Success!  Check email to confirm account."});
        });
    });
});


/**
 * @api {post} /auth/login Perform authentication
 * @apiName LocalAuth
 * @apiDescription Perform authentication using username(or email) and password get JWT token.
 * @apiGroup Auth
 *
 * @apiParam {String} username Username or email address
 * @apiParam {String} password Password!
 *
 * @apiSuccess {Object} jwt JWT token
 */
router.post('/login', function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
        if (err) return next(err);
        if (!user) return next(info);
        if (!user.confirmed) {
            res.status(500).send('User email not yet confirmed.  Check your email for confirmation link.');
            next();
        }
        common.issue_jwt(user, function(err, jwt) {
            if(err) return next(err);
            res.json({message: "Login Success!", jwt: jwt, profile: {name: user.name, email: user.email, roles: user.roles, quota: user.quota, id: user._id}});
        });
    })(req, res, next);
});


/**
 * @api {get} /auth/confirm/:id/:token Verify registration token
 * @apiName LocalAuth
 * @apiDescription Confirm the user's email and enable their account by validating the issued token
 * @apiGroup Auth
 *
 *
 * @apiSuccess {String} status Returns 'ok' if token confirmed
 */
router.get('/confirm/:id/:token', function(req, res, next) {
    db.User.findById(req.params.id).exec(function(err, _user){
        if(err) return next(err);
        if(!_user) res.status(500).send('User not found');
        if(_user.confirmed) res.status(500).send('Confirmation token already used');
        if(_user.confirmation_token !== req.params.token) {
            res.status(500).send("Invalid confirmation token!");
        } else {
            console.log(_user);
            _user.confirmed = true;
            _user.save().then(function() {
                res.send({status: "ok", message: "User email confirmed!  Please login."})
            });
        }
    });
});


/**
 * @api {get} /auth/logout Perform logout and remove session
 * @apiName LocalAuth
 * @apiDescription Perform authentication using username(or email) and password get JWT token.
 * @apiGroup Auth
 *
 *
 * @apiSuccess {String} status Returns 'ok' if log out succeed
 * @apiSuccess {String} message Longer status message
 */
router.get('/logout', function(req, res, next) {
    req.logout();
    res.json({status: "ok", message: "Successfully logged out."});
});


/**
 * @api {get} /auth/list Get list of users
 * @apiName AuthList
 * @apiDescription Get list of registered users on the system
 * @apiGroup Auth
 *
 * @apiParam {String} jwt JSON web token
 *
 * @apiSuccess {Object} users List of registered users
 */
router.get('/list', common.check_jwt, common.admin_only,  function(req, res, next) {
    db.User.find({}, {'hash': 0, 'salt': 0}).exec(function(err, _users){
        if(err) return next(err);
        res.send(_users);
    });
});

//used to setpassword if password_hash is empty or update exiting password (with a valid current password)
// router.put('/setpass', jwt({secret: config.auth.public_key}), function(req, res, next) {
//     db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
//         logger.debug("setting password for sub:"+req.user.sub);
//         if(user) {
//             if(user.password_hash) {
//                 if(!user.isPassword(req.body.password_old)) {
//                     return setTimeout(function() {
//                         next("Wrong current password");
//                     }, 2000);
//                 }
//             }
//             user.setPassword(req.body.password, function(err) {
//                 if(err) return next(err);
//                 user.updateTime('password_reset');
//                 user.save().then(function() {
//                     res.json({status: "ok", message: "Password reset successfully."});
//                 });
//             });
//         } else {
//             logger.info("failed to find user with sub:"+req.user.sub);
//             res.status(404).end();
//         }
//     });
// });

/**
 * @api {post} /local/resetpass Handle both resetpass request and fulfillment request
 * @apiName LocalAuth
 * @apiDescription  (mode 1)
 *                  When this API is called with email field, it will create reset token associated with the owner of the email address
 *                  and send reset request email with the token on the URL. While doing so, it sets httpOnly cookie with random string
 *                  to be stored on user's browser.
 *                  (mode 2)
 *                  When user receives an email, click on the URL, it will open /forgotpass page which then provide user password reset form.
 *                  The form then submits token, and new password along with the httpOnly cookie back to this API which will then do the
 *                  actual resetting of the password, and clear the password_reset_token.
 * @apiGroup Local
 *
 * @apiParam {String} email     (mode1) User's email address registere.
 * @apiParam {String} token     (mode2) User's password reset token
 * @apiParam {String} password  (mode2) User's new password
 * @apiParam {String} password_reset (mode2) [via cookie] browser secret token to verify user is using the same browser to reset password
 *
 * @apiSuccess {Object} message Containing success message
 */
// router.post('/resetpass', function(req, res, next) {
//     if(req.body.email)  {
//         //initiate password reset
//         var email = req.body.email;
//         db.User.findOne({where: {email: email}}).then(function(user) {
//             if(!user) return res.status(404).json({message: "No such email registered"});
//             //we need 2 tokens - 1 to confirm user, and 1 to match the browser (cookie)
//             user.password_reset_token = Math.random().toString(36).substr(2);
//             user.password_reset_cookie = Math.random().toString(36).substr(2);
//             common.send_resetemail(req.headers.referer||config.local.url, user, function(err) {
//                 if(err) return next(err);
//                 user.save().then(function() {
//                     res.cookie('password_reset', user.password_reset_cookie, {httpOnly: true, secure: true}); //should be default to session cookie
//                     res.json({message: "Reset token sent"});
//                 });
//             });
//
//         }).catch(next);
//     } else {
//         //fulfull password reset
//         var token = req.body.token;
//         var password = req.body.password;
//         var cookie = req.cookies.password_reset;
//         if(!token || !password) return next("missing parameters");
//         db.User.findOne({where: {password_reset_token: token, password_reset_cookie: cookie}}).then(function(user) {
//             if(user) {
//                 user.setPassword(password, function(err) {
//                     if(err) return next(err);
//                     user.password_reset_token = null;
//                     user.password_reset_cookie = null;
//                     user.save().then(function() {
//                         res.json({status: "ok", message: "Password reset successfully."});
//                     });
//                 });
//             } else return next("couldn't find the token provided");
//         });
//     }
// });

/*
 //reset password (with a valid reset token) ?token=123
 router.put('/resetpass', function(req, res, next) {
 });
 */

module.exports = router;
