const crypto = require('crypto');
const axios = require('axios')
const { v4: uuid } = require('uuid');
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

    console.log('client joined')

    socket.on('join', function (name, password){
        socket.id = uuid();
        clients.push(socket.id)

        var user_password = crypto.createHash('sha256').update(password).digest('base64');

        socket.name = name
        socket.password = user_password

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
        clients.splice(clients.indexOf(socket.id), 1)
    });

    socket.on('message', function (message) {
        console.log(socket.name+": "+ message);
        console.log(clients)
    });
});
