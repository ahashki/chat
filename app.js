var server = require('./server'),
    wp7 = require('./wp7'),
    dal = require('./data'),
    app = server.app,
    io = server.io;

io.set('log level', 0);

function sendMessage(data) {
    dal.saveMessage(data);
    io.sockets.socket(data.id).broadcast.emit('message', data);
    sendToWp7(data);
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
        dal.removeUser(socket.id);
        socket.broadcast.emit('disconnect', socket.id);
    }

    function socketMessage(data) {
        data.id = socket.id;
        sendMessage(data);
    }

    function socketLoadMessage() {
        dal.getMessageHistory(20, function(data) {
            socket.emit('load-history', data);
        });
    }

    function socketGetUsers() {
        dal.getActiveUsers(function(users) {
           socket.emit('get-users', users); 
        });
    }

    function socketRegister(data) {
        data.id = socket.id;
        dal.addUser(data, function(user) {
            socket.emit('register', user);
            socket.broadcast.emit('new-user', user);            
        });
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
