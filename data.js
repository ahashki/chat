var mongo = require('mongoskin'),
    db = mongo.db('localhost:27017/chat?auto_reconnect');

var users = {};

exports.getMessageHistory = function(room, limit, fn) {
	if(typeof(fn) !== 'function') {
		return;
	}

	db.collection('messages').find({'room': room}, { 'limit': limit, sort: [['timestamp', -1]] }).toArray(function(err, data) {
		if(err) {
			throw err;
		}

		fn(data);
	});
};

exports.applyToUsers = function(fn) {
	if(typeof(fn) !== 'function') {
		return;
	}

	for(var i in users) {
		fn(users[i]);
    }
}

exports.getActiveUsers = function(room, fn) {
	if(typeof(fn) !== 'function') {
		return;
	}
	
	fn(users[room]);
}

exports.addUser = function(room, user, fn) {
	if (user.nickname == 'anon') {
        user.nickname += '-' + user.id;
    }

    if(!users[room]) {
    	users[room] = [];
    }

    users[room].push({
        id: user.id,
        nickname: user.nickname
    });

	if(typeof(fn) === 'function') {
		fn(user);
	}
}

exports.removeUser = function(room, userId) {
	for (var i in users[room]) {
        if (users[room][i].id == userId) {
            users[room].splice(i, 1);
            break;
        }
    }
}

exports.updateName = function(room, userId, nickname, fn) {
	var updatedName = false;
	for (var i in users[room]) {
        if (users[room][i].id == userId) {
            users[room][i].nickname = nickname;
            updatedName = true;
            break;
        }
    }

	if(typeof(fn) === 'function') {
		fn(updatedName);
	}
}

exports.checkName = function(room, nickname, fn) {
	var exists = false;
	for (var i in users[room]) {
        if (users[room][i].nickname == nickname) {
            exists = true;
            break;
        }
    }

	if(typeof(fn) === 'function') {
		fn(exists);
	}
}

exports.saveMessage = function(message) {
	db.collection('messages').save(message, { upsert: true });
}
