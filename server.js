var express = require('express'),
    mongo = require('mongoskin'),
    db = mongo.db('localhost:27017/chat?auto_reconnect');
var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
io.set('log level', 0);

app.configure(function(){
    app.use(express.static(__dirname + '/public/'));
});

var enableLog = true;

function log(message) {
    if (enableLog) {
        console.log(message);
    }
}

app.listen(process.env.C9_PORT || 14243);

var users = [];

io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function () {
        var data = {
            id: socket.id
        };

        for (var i in users) {
            if (users[i].id == data.id) {
                data.nickname = users[i].nickname;
                users.splice(i, 1);
                break;
            }
        }

        socket.broadcast.emit('disconnect', data);
    });

    socket.on('message', function (data) {
        data.id = socket.id;

        db.collection('messages').save(data, { upsert: true }, function () {
            log('message saved');
            log(data);
        });

        socket.broadcast.emit('message', data);
    });

    socket.on('load-history', function () {
        db.collection('messages').find({}, { 'limit': 20, sort: [['timestamp', -1]] }).toArray(function(err, data) {
            socket.emit('load-history', data);
            log('message history loaded');
            log(data);
        });
    });

    socket.on('get-users', function () {
        socket.emit('get-users', users);
    });

    socket.on('register', function (data) {
        data.id = socket.id;

        socket.emit('register', data);

        if (data.nickname == 'anon') {
            data.nickname += '-' + data.id;
        }

        users.push({
            id: socket.id,
            nickname: data.nickname
        });

        socket.broadcast.emit('new-user', data);
    });

    socket.on('update-nickname', function (data) {
        data.id = socket.id;

        for (var i in users) {
            if (users[i].id == data.id) {
                users[i].nickname = data.nickname;
                break;
            }
        }

        io.sockets.emit('update-nickname', data);
    });

    socket.on('check-nickname', function (data) {
        data.id = socket.id;
        data.exists = false;

        for (var i in users) {
            if (users[i].nickname.toLowerCase() == data.nickname.toLowerCase()) {
                if (users[i].id != socket.id) {
                    data.exists = true;
                }
                break;
            }
        }

        socket.emit('check-nickname', data);
    });
});