var mongo = require('mongoskin'),
    db = mongo.db('localhost:27017/chat?auto_reconnect'),
    server = require('./server'),
    wp7 = require('./wp7'),
    app = server.app,
    io = server.io;

io.set('log level', 0);

function sendToWp7(data) {
    var rawMessage = wp7.getToastXml(data.nickname, data.message);
    for(var i in users) {
        if(users[i].uri) {
            wp7.sendToast(users[i].uri, rawMessage);
        }
    }
};

function httpRegisterCallback = function(req, res) {
    var data = {
            id: req.body.userId,
            nickname: req.body.nickname,
            uri: new Buffer(req.body.uri, 'base64').toString('ascii')
        };
    users.push(data);
    io.sockets.emit('new-user', data);
    res.send(true);
}

function httpSendMessage(req, res) {
        var data = {
            nickname: req.body.nickname,
            message: new Buffer(req.body.message, 'base64').toString('ascii'),
            id: req.body.userId
        }

        io.sockets.emit('message', data);
        sendToWp7(data);
        res.send(true);
}

app.post('/RegisterCallback', httpRegisterCallback);
app.post('/SendMessage', httpSendMessage);

var users = [];

io.sockets.on('connection', function (socket) {
    function socketDisconnect() {
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
    }

    function socketMessage(data) {
        data.id = socket.id;

        db.collection('messages').save(data, { upsert: true }, function () {
        });

        socket.broadcast.emit('message', data);
        sendToWp7(data);
    }

    function socketLoadMessage() {
        db.collection('messages').find({}, { 'limit': 20, sort: [['timestamp', -1]] }).toArray(function(err, data) {
            socket.emit('load-history', data);
        });
    }

    function socketGetUsers() {
        socket.emit('get-users', users);
    }

    function socketRegister(data) {
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
    }

    function socketUpdateNickname(data) {
        data.id = socket.id;

        for (var i in users) {
            if (users[i].id == data.id) {
                users[i].nickname = data.nickname;
                break;
            }
        }

        io.sockets.emit('update-nickname', data);
    }

    function socketCheckNickname(data) {
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
    }

    socket.on('disconnect', socketDisconnect);
    socket.on('message', socketMessage);
    socket.on('load-history', socketLoadMessage);
    socket.on('get-users', socketGetUsers);
    socket.on('register', socketRegister);
    socket.on('update-nickname', socketUpdateNickname);
    socket.on('check-nickname', socketCheckNickname);
});
