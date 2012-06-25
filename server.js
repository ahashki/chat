var express = require('express'),
    app = express.createServer(),
    io = require('socket.io').listen(app);
io.set('log level', 0);

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true,
        showStack: true }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});

app.listen(3008);

exports.app = app;
exports.io = io;
