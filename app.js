
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
    res.sendfile('./public/content.html');
});

app.get('/:room', function(req, res) {
    res.sendfile('./public/content.html');
});


io.sockets.on('connection', function (socket) {
    
    socket.on('disconnect', function() {
        console.log('socket disconnected: ');
        var user = dal.getUserFromSocketId(socket.id);
        console.log('removing user');
        console.log(user);
        dal.removeUser(user);
        dal.removeSocketMap(socket.id);
        socket.broadcast.to(user.room).emit('disconnect', user.userId);
    });
    

    socket.on('message', function(data) {
        dal.saveMessage(data);
        socket.broadcast.to(data.room).emit('message', data);
    });
    
    
    socket.on('load-history', function(data) {
        dal.getMessageHistory(data.room, 20, function(messages) {
            socket.emit('load-history', messages);
        });
    });
    

    socket.on('get-users', function(data) {
        dal.getActiveUsers(data.room, function(users) {
            socket.to(data.room).emit('get-users', users); 
        });
    });

    
    socket.on('register', function (data) {
        socket.join(data.room);
        dal.mapSocketIdToUser(socket.id, data);
        dal.addUser(data, function(user) {
            socket.emit('register', user);
            socket.broadcast.to(data.room).emit('new-user', user);
        });
    });
    

    socket.on('update-nickname', function(data) {
        dal.updateName(data, function(updateName) {
            if(updateName) {
                console.log('Sending nickname update to room: ' + data.room);
                io.sockets.to(data.room).emit('update-nickname', data);
            }
        });
    });
    

    socket.on('check-nickname', function(data) {
        data.exists = false;
        dal.checkName(data, function(nameExists) {
            data.exists = nameExists;
            socket.to(data.room).emit('check-nickname', data);
        });
    });
});
