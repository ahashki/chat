var mongo = require('mongoskin')
    , db = mongo.db('localhost:27017/chat?auto_reconnect')
	, users = {}
	, userMap = {};

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

exports.removeSocketMap = function(socketId) {
	delete userMap[socketId];
}

exports.mapSocketIdToUser = function(socketId, user) {
	userMap[socketId] = user;
}

exports.getUserFromSocketId = function(socketId) {
	return userMap[socketId];
}

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

exports.addUser = function(user, fn) {
	if (user.nickname == 'anon') {
        user.nickname += '-' + user.userId;
    }

    if(!users[user.room]) {
    	users[user.room] = [];
    }

    users[user.room].push({
        userId: user.userId,
        nickname: user.nickname
    });

	if(typeof(fn) === 'function') {
		fn(user);
	}
}

exports.removeUser = function(data) {
	for (var i in users[data.room]) {
        if (users[data.room][i].userId == data.userId) {
            users[data.room].splice(i, 1);
            break;
        }
    }
}

exports.updateName = function(data, fn) {
	var updatedName = false;
	for (var i in users[data.room]) {
        if (users[data.room][i].userId == data.userId) {
            users[data.room][i].nickname = data.nickname;
            updatedName = true;
            break;
        }
    }

	if(typeof(fn) === 'function') {
		fn(updatedName);
	}
}

exports.checkName = function(data, fn) {
	var exists = false;
	for (var i in users[data.room]) {
        if (users[data.room][i].nickname == data.nickname) {
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
