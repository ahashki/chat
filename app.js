var server = require('./server'),
    wp7 = require('./wp7'),
    dal = require('./data'),
    app = server.app,
    io = server.io;

io.set('log level', 0);

function getRandomRoomName() {
    return Math.floor(Math.random() * 1000000).toString(36).toUpperCase();
}

app.get('/', function(req, res) {
    console.log('ROOT REQUESTED!');
    res.redirect('/' + getRandomRoomName());
});

app.get('/:room', function(req, res) {
    res.sendfile('./public/content.html');
});

function sendMessage(data) {
    var socket = io.sockets.socket(data.id);
    socket.get('room', function(err, room) {
        data.room = room;
        dal.saveMessage(data);
        sendToWp7(data);
        socket.broadcast.to(room).emit('message', data);
    });
}

function sendToWp7(data) {
    var rawMessage = wp7.getToastXml(data.nickname, data.message);
    dal.applyToUsers(function(user) {
        if(user.uri) {
            wp7.sendToast(user.uri, rawMessage);
        }
    });
};

function httpRegisterCallback (req, res) {
    var data = {
            id: req.body.userId,
            nickname: req.body.nickname,
            uri: new Buffer(req.body.uri, 'base64').toString('ascii')
        };
    dal.addUser(data, function(user) {
        io.sockets.emit('new-user', data);
        res.send(true);
    });
}

function httpSendMessage(req, res) {
    var data = {
        nickname: req.body.nickname,
        message: new Buffer(req.body.message, 'base64').toString('ascii'),
        id: req.body.userId
    }

    sendMessage(data);
    res.send(true);
}

app.post('/RegisterCallback', httpRegisterCallback);
app.post('/SendMessage', httpSendMessage);

io.sockets.on('connection', function (socket) {
    function socketDisconnect() {
        socket.get('room', function(err, room) {
            dal.removeUser(room, socket.id);
            socket.broadcast.to(room).emit('disconnect', socket.id);
        });
    }

    function socketMessage(data) {
        data.id = socket.id;
        sendMessage(data);
    }

    function socketLoadMessage() {
        socket.get('room', function(err, room) {
            dal.getMessageHistory(room, 20, function(data) {
                socket.emit('load-history', data);
            });
        });
    }

    function socketGetUsers() {
        socket.get('room', function(err, room) {
            dal.getActiveUsers(room, function(users) {
                socket.to(room).emit('get-users', users); 
            });
        });
    }

    function socketRegister(data) {
        socket.get('room', function(err, room) {
            data.id = socket.id;
            dal.addUser(room, data, function(user) {
                socket.emit('register', user);
                socket.broadcast.to(room).emit('new-user', user);
            });
        });
    }

    function socketUpdateNickname(data) {
        data.id = socket.id;
        socket.get('room', function(err, room) {
            dal.updateName(room, socket.id, data.nickname, function(updateName) {
                if(updateName) {
                    console.log('UPDATED NAME: ' + data.nickname);
                    io.sockets.to(room).emit('update-nickname', data);
                }
            });
        });
    }

    function socketCheckNickname(data) {
        data.id = socket.id;
        data.exists = false;
        socket.get('room', function(err, room) {
            dal.checkName(room, data.nickname, function(nameExists) {
                data.exists = nameExists;
                socket.to(room).emit('check-nickname', data);
            });
        });
    }

    socket.on('disconnect', socketDisconnect);
    socket.on('message', socketMessage);
    socket.on('load-history', socketLoadMessage);
    socket.on('get-users', socketGetUsers);
    socket.on('register', socketRegister);
    socket.on('update-nickname', socketUpdateNickname);
    socket.on('check-nickname', socketCheckNickname);
    socket.on('join', function(room) {
        socket.set('room', room, function() { console.log('room ' + room + ' saved'); } );
        socket.join(room);
    });
});
