module.exports = function(app) {
  var User = app.models.user;

  User.create([
    {username: 'Admin', email: 'youngmd@iu.edu', password: 'admin'},
    {username: 'Guest', email: 'guest@imagex.sca', password: 'demo'}
  ], function(err, users) {
    if (err) console.log(err);

    console.log('Created users:', users);
  });
}
