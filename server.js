var app = require('express').createServer();
var io = require('socket.io').listen(app);
io.set('log level', 0);

app.listen(8080);

app.get('/', function (req, res) {
    console.log('served static file ' + __dirname + '/index.html');
    res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function () {
        var data = { id: socket.id };
        socket.broadcast.emit('disconnect', data);
    });

    socket.on('mouse-location', function (data) {
        data.id = socket.id;
        socket.broadcast.emit('mouse-location', data);
    });

    socket.on('message', function (data) {
        data.id = socket.id;
        socket.broadcast.emit('message', data);
    });

    socket.on('register', function (data) {
        data.id = socket.id;
        socket.emit('register', data);

        if (data.nickname == 'anon') {
            data.nickname += '-' + data.id;
        }

        socket.broadcast.emit('new-user', data);
    });

    socket.on('update-nickname', function (data) {
        data.id = socket.id;
        io.sockets.emit('update-nickname', data);
    });
});