const uuid = require('uuid/v4');
var express = require('express'),
    app = express(),
    http = require('http'),
    socketIO = require('socket.io'),
    server, io;

app.get('/', function (req, res) {
    res.send('listening for sockets on port 5000');
});

server = http.Server(app);
server.listen(5000);
console.log('socket server running on port 5000')

io = socketIO(server);

var clients = []

io.on('connection', function (socket) {

    socket.on('connect', function (){
        console.log('client joined')
        socket.id = uuid();
        clients.push(socket.id)
    });

    socket.on('disconnect', function () {
        console.log("client left");
        clients.filter(item => item !== socket.id);
    });

    socket.on('message', function (message) {
        console.log(message);
    });
});