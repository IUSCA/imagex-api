
//contrib
var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
var winston = require('winston');

//mine
var config = require('../imagex-config/api/config.js')(winston);

exports.init = function(cb) {
    mongoose.connect(config.mongodb, {}, function(err) {
        if(err) return cb(err);
        console.log("connected to mongo");
        cb();
    });
}

///////////////////////////////SCHEMAS/////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

////////////////////////////////USERS//////////////////////////////////////

var userSchema = mongoose.Schema({
    dateRegistered: { type: Date, default: Date.now },
    name: mongoose.Schema.Types.String,
    email: mongoose.Schema.Types.String,
    username: mongoose.Schema.Types.String,
    roles: [{ type: String }],
    quota: mongoose.Schema.Types.Number,
    confirmation_token: mongoose.Schema.Types.String,
    confirmed: { type: Boolean, default: false },
});

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

exports.User  = mongoose.model('User', userSchema);

var roleSchema = mongoose.Schema({
    name: mongoose.Schema.Types.String,
    canView: { type: Boolean, default: true },
    canAdmin: { type: Boolean, default: false },
});
exports.Role  = mongoose.model('Role', roleSchema);

var groupSchema = mongoose.Schema({
    name: mongoose.Schema.Types.String,
    owner: mongoose.Schema.Types.ObjectId,
    members: [mongoose.Schema.Types.ObjectId],
});
exports.Group  = mongoose.model('Group', groupSchema);

/////////////////////////////////DATA//////////////////////////////////////

var exposureSchema = mongoose.Schema({
    dateAdded: { type: Date, default: Date.now },
    filter: mongoose.Schema.Types.String,
    ra0: mongoose.Schema.Types.Number,
    dec0: mongoose.Schema.Types.Number,
    loc: {
        type: { type: String },
        coordinates: []
    },
    corners: mongoose.Schema.Types.Mixed,
    height: mongoose.Schema.Types.Number,
    width: mongoose.Schema.Types.Number,
    pixelscale: mongoose.Schema.Types.Number,
    size: mongoose.Schema.Types.Number,
    owner: mongoose.Schema.Types.ObjectId,
    group: mongoose.Schema.Types.ObjectId,
    filename: mongoose.Schema.Types.String
});
exposureSchema.index({ "loc": "2dsphere" });
exports.Exposure  = mongoose.model('Exposure', exposureSchema);

var headerSchema = mongoose.Schema({
    exposureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exposure' },
    dateAdded: { type: Date, default: Date.now },
    keys: { type: Map, of: mongoose.Schema.Types.Mixed },
    comments: { type: Map, of: String },
});
exports.Header  = mongoose.model('Header', headerSchema);

/////////////////////////////////SITE//////////////////////////////////////

var searchSchema = mongoose.Schema({
    field: mongoose.Schema.Types.String,
    label: mongoose.Schema.Types.String,
    units: mongoose.Schema.Types.String,
    min: mongoose.Schema.Types.Number,
    max: mongoose.Schema.Types.Number,
    placeholder: mongoose.Schema.Types.String,
    type: mongoose.Schema.Types.String,
    active: { type: Boolean, default: true },
});
exports.Search  = mongoose.model('Search', searchSchema);

var processSchema = mongoose.Schema({
    name: mongoose.Schema.Types.String,
    status: mongoose.Schema.Types.String,
    progress: mongoose.Schema.Types.Number,
    started_at: { type: Date, default: Date.now },
    ended_at: mongoose.Schema.Types.Date,
    last_updated: mongoose.Schema.Types.Date,
    parentID:  mongoose.Schema.Types.ObjectId,
    refID: mongoose.Schema.Types.String,
    //owner: mongoose.Schema.Types.ObjectId,
    hidden: { type: Boolean, default: false },
});
exports.Process  = mongoose.model('Process', processSchema);

var configSchema = mongoose.Schema({
    last_updated: { type: Date, default: Date.now },
    site_config: mongoose.Schema.Types.Mixed
});
exports.Config  = mongoose.model('Config', configSchema);



