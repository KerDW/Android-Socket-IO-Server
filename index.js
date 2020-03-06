const crypto = require('crypto');
const axios = require('axios')
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

var waiting = []

io.on('connection', function (socket) {

    console.log('client joined')
    console.log(Object.keys(io.sockets.connected).length)

    socket.on('join', function (name, password){

        var user_password = crypto.createHash('sha256').update(password).digest('base64');

        socket.name = name
        socket.password = user_password

        if(Object.keys(io.sockets.connected).length > 2 && waiting.length > 0){
            io.to(`${socketId}`).emit('ready')
            // io.to(waiting.shift().id).emit('ready') remove oldest waiting socket and ready him
            // check if you can emit to with socket.id
        } else {
            waiting.push(socket)
        }

        axios.post('http://localhost/laravelrestapi/public/api/users', {
            name: name,
            password: user_password
        })
        .then((res) => {
            console.log('user added')
        })
        .catch((error) => {
            console.log(error.message)
            console.log(error.data.message)
        })
    });

    socket.on('disconnect', function () {
        console.log("client left");
    });

    socket.on('message', function (message) {
        console.log(socket.name+": "+ message);
        io.to(`${socketId}`).emit('message', socket.name+": "+ message);
    });
});
