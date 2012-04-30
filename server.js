var express = require('express'),
    mongo = require('mongoskin'),
    url = require('url'),
    http = require('http'),
    db = mongo.db('localhost:27017/chat?auto_reconnect');
var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
io.set('log level', 0);

// Configuration
//
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true,
        showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

var enableLog = true;

function log(message) {
    if (enableLog) {
        console.log(message);
    }
}

function getToastXml(nickname, message) {
    return '<?xml version="1.0" encoding="utf-8"?><wp:Notification xmlns:wp="WPNotification"><wp:Toast><wp:Text1>' + nickname + '</wp:Text1><wp:Text2>' + message + '</wp:Text2></wp:Toast></wp:Notification>';
    //return '<?xml version="1.0" encoding="utf-8"?><wp:Notification xmlns:wp="WPNotification"><wp:Toast><wp:Text1>' + new Buffer(nickname, 'binary').toString('base64') + '</wp:Text1><wp:Text2>' + new Buffer(message, 'binary').toString('base64') + '</wp:Text2></wp:Toast></wp:Notification>';
}

function sendToast(uri, rawMessage) {
    var siteUrl = url.parse(uri);
    var site = http.createClient(80, siteUrl.host);
    var request = site.request("POST", siteUrl.pathname, {'host' : siteUrl.host, 'Content-Type': 'text/xml', 'Content-Length': rawMessage.length, "X-NotificationClass": "2", "X-WindowsPhone-Target": "toast"});
    console.log(rawMessage);
    request.write(rawMessage);
    request.end();
}

app.post('/RegisterCallback', function(req, res) {
    console.log('Received Callback');
    var data = {
            id: req.body.userId,
            nickname: req.body.nickname,
            uri: new Buffer(req.body.uri, 'base64').toString('ascii')
        };
    users.push(data);
    io.sockets.emit('new-user', data);
    res.send(true);
});

app.post('/SendMessage', function(req, res) {
        console.log('Received Message');
        var data = {
            nickname: req.body.nickname,
            message: new Buffer(req.body.message, 'base64').toString('ascii'),
            id: req.body.userId
        }

        console.log('sending message');
        console.log(data);

        io.sockets.emit('message', data);
        sendToWp7(data);
        res.send(true);
});


function sendToWp7(data) {
    var rawMessage = getToastXml(data.nickname, data.message);
    console.log(users);
    for(var i in users) {
        if(users[i].uri) {
            console.log('sending message to : ');
            console.log(users[i]);
            sendToast(users[i].uri, rawMessage);
        }
    }
};


app.listen(3008);

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
        sendToWp7(data);
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
