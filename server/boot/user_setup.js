module.exports = function(app) {
    var User = app.models.user;
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    var lookupAndAddRole = function(user, rolename){
        Role.findOrCreate({name: rolename}, function(err, role) {
            role.principals.create({
                principalType: RoleMapping.USER,
                principalId: user.id
            }, function (err, principal) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Created principal:', principal);
                }
            });
        });
    };

    User.findOrCreate({ where: {email: 'admin@imagex.sca'} }, {username: 'Admin', email: 'admin@imagex.sca', password: 'admin'}, function(err, user) {
        if (err){
            console.log(err);
        } else {
            lookupAndAddRole(user,'admin');
        }
    });

    User.findOrCreate({ where: {email: 'guest@imagex.sca'} }, {username: 'Guest', email: 'guest@imagex.sca', password: 'demo'}, function(err, user) {
        if (err) {
            console.log(err);
        } else {
            lookupAndAddRole(user, 'guest');
        }
    });
}
