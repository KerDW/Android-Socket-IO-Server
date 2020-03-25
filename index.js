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

    // https://socket.io/docs/emit-cheatsheet/

    console.log('client joined, connected clients:')
    console.log(Object.keys(io.sockets.connected).length)

    // assign a color for its marker
    socket.color = Math.floor(Math.random() * 360)

    socket.on('join', function (name, password){

        var hashed_password = crypto.createHash('sha256').update(password).digest('base64');

        socket.name = name
        socket.password = hashed_password

        // add user to db
        axios.post('http://localhost/laravelrestapi/public/api/users', {
            name: name,
            password: hashed_password
        })
        .then((res) => {
            console.log('user added')
            socket.user_id = res.data.id
        })
        .catch((error) => {
            console.log(error.message)
        })
    });

    // leave any previous room the client had joined, join a new one and check if this room is ready
    socket.on('joinRoom', function (room_id, room_name, max_capacity) {

        socket.leaveAll()
        socket.join(room_name)

        // save the room id on the socket while the user is there
        socket.room_id = room_id
        socket.room_name = room_name

        // add room to user
        axios.put('http://localhost/laravelrestapi/public/api/users/' + socket.user_id, {
            room_id: room_id,
        })
        .then((res) => {

            room_clients_count = io.sockets.adapter.rooms[room_name].length

            if(room_clients_count == max_capacity){

                axios.put('http://localhost/laravelrestapi/public/api/rooms/' + room_id, {
                    busy: true
                })
                .then(function(){
                    io.emit('roomUpdate')

                    var charset = "AEIOU";

                    console.log(charset.charAt(Math.floor(Math.random() * charset.length)))

                    var randomLetter = charset.charAt(Math.floor(Math.random() * charset.length))
                    var requirement;

                    switch(Math.floor(Math.random() * 3)){
                        case 0:
                            requirement = 'containing'
                        break;
                        case 1:
                            requirement = 'ending with'
                        break;
                        case 2:
                            requirement = 'starting with'
                        break;
                    }

                    io.in(room_name).emit('ready', randomLetter, requirement)
                })

            }

            io.emit('roomUpdate')
            
        })
        .catch((error) => {
            console.log(error)
        })
    });

    socket.on('newRoom', function () {
        io.emit('roomUpdate')
    });

    socket.on('gameFinished', function () {

        axios.put('http://localhost/laravelrestapi/public/api/users/' + socket.user_id, {
            room_id: null,
        })
        
        // if the room doesn't exist or it only has one user left set it as not busy
        if(!io.sockets.adapter.rooms[socket.room_name] || io.sockets.adapter.rooms[socket.room_name].length == 1){
            axios.put('http://localhost/laravelrestapi/public/api/rooms/' + socket.room_id, {
                busy: false
            })
        }

        socket.leaveAll()
        socket.room_id = null
        socket.room_name = null

    });

    // emit marker to sockets in the same room
    socket.on('newMarker', function (lat, long, username) {
        var room = Object.keys(socket.rooms);
        socket.to(room[0]).emit('marker', lat, long, username, socket.color)
    });

    socket.on('disconnect', function () {
        // remove user from db (temporary to avoid clogging the db)
        axios.delete('http://localhost/laravelrestapi/public/api/users/' + socket.user_id)
        .then((res) => {
            console.log('user removed')
        })
        .catch((error) => {
            console.log(error.message)
        })
    });

    // socket.on('message', function (message) {
    //     console.log(socket.name+": "+ message);
        
    //     var client_room = Object.values(socket.rooms)[1]
    //     // send message to paired client (room)
    //     socket.to(client_room).emit('message', socket.name+": "+ message);
    // });
});
