var mongo = require('mongoskin'),
    db = mongo.db('localhost:27017/chat?auto_reconnect');

var users = [];

exports.getMessageHistory = function(limit, fn) {
	if(typeof(fn) !== 'function') {
		return;
	}

	db.collection('messages').find({}, { 'limit': limit, sort: [['timestamp', -1]] }).toArray(function(err, data) {
		if(err) {
			throw err;
		}

		fn(data);
	});
};

exports.getActiveUsers = function(fn) {
	if(typeof(fn) !== 'function') {
		return;
	}
	
	fn(users);
}

exports.addUser = function(user, fn) {
	if (user.nickname == 'anon') {
        user.nickname += '-' + user.id;
    }

    users.push({
        id: user.id,
        nickname: user.nickname
    });

	if(typeof(fn) === 'function') {
		fn(user);
	}
}

exports.removeUser = function(user) {
	for (var i in users) {
        if (users[i].id == data.id) {
            data.nickname = users[i].nickname;
            users.splice(i, 1);
            break;
        }
    }
}

exports.saveMessage = function(message) {
	db.collection('messages').save(message, { upsert: true });
}
