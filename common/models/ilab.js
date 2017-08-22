'use strict';

module.exports = function(Ilab) {
	Ilab.users = function(cb) {
		var IlabCollection = Ilab.getDataSource().connector.collection(Ilab.modelName),
			uniqueUsers = IlabCollection.distinct('name', function (err, users) {
				console.log(users)
				cb(err, users)
			})
	};

	Ilab.remoteMethod(
		'users', {
		http: {
			path: '/users',
			verb: 'get'
		},
		returns: {
				arg: 'data',
				type: 'array'
			}
		}
	);
};
