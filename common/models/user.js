'use strict';

module.exports = function(User) {
    User.getRolesById = function (id, cb) {
        User.getApp(function (err, app) {
            if (err) throw err;
            var RoleMapping = app.models.RoleMapping;
            var Role = app.models.Role;
            RoleMapping.find({ where : { principalId: id }}, function (err, roleMappings) {
                if (!roleMappings.length) { return cb(null, { "roles": [] }); }
                var roleIds = roleMappings
                    .map(function (roleMapping) {
                        return roleMapping.roleId;
                    });
                var conditions = roleIds.map(function (roleId) {
                    return { id: roleId };
                });
                Role.find({ where: { or: conditions}}, function (err, roles) {
                    if (err) throw err;
                    var roleNames = roles.map(function(role) {
                        return role.name;
                    });
                    cb(null, {"roles": roleNames});
                });
            });
        });
    };

    User.remoteMethod('getRolesById', {
        http: { path: '/:id/getRolesById', verb: 'get' },
        accepts: {arg: 'id', type: 'string'},
        returns: { arg: 'payload', type: 'Object' }
    });


};
