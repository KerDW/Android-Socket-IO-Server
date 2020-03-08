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
var room_number = 1;

io.on('connection', function (socket) {

    console.log('client joined, connected clients:')
    console.log(Object.keys(io.sockets.connected).length)

    socket.on('join', function (name, password){

        function addUser(){

            var hashed_password = crypto.createHash('sha256').update(password).digest('base64');

            socket.name = name
            socket.password = hashed_password

            // add user to db
            axios.post('http://localhost/laravelrestapi/public/api/users', {
                name: name,
                password: hashed_password
            })
            .then((res) => {
                socket.user_id = res.data.id
            })
            .catch((error) => {
                console.log(error.message)
            })

        }

        // if this socket can be paired with one that is waiting which is not himself
        if(waiting.length > 0 && !waiting.includes(socket)){
            addUser();

            oldest_waiting_socket = waiting.shift()
            room_name = 'room'+room_number

            // place clients in common room
            socket.join(room_name);
            oldest_waiting_socket.join(room_name);

            room_number++

            io.in(room_name).emit('ready') // ready clients
        } else if (!waiting.includes(socket)){
            addUser();
            waiting.push(socket)
        }
    });

    socket.on('disconnect', function () {
        // remove user from db (temporary to avoid clogging the db)
        axios.delete('http://localhost/laravelrestapi/public/api/users/' + socket.user_id)
        .catch((error) => {
            console.log(error.message)
        })
    });

    socket.on('message', function (message) {
        console.log(socket.name+": "+ message);
        
        var client_room = Object.values(socket.rooms)[1]
        // send message to paired client (room)
        socket.to(client_room).emit('message', socket.name+": "+ message);
    });
});
