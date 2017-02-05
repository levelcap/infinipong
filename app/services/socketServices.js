var EventServices = require('../services/eventServices');
var Event = require('../models/event');

function SocketServices(io) {
    this.io = io;
}

SocketServices.prototype.start = function () {
    var io = this.io;
    var eventServices = new EventServices();

    io.on('connection', function (socket) {
        console.log('a user connected');
        socket.on('disconnect', function () {
            console.log('user disconnected');
        });
    });

    io.sockets.on('connection', function (socket) {
        var _room, _player;
        socket.on('join', function (data) {
            _room = data.room;
            _player = data.player;

            console.log("Adding socket " + socket + " to room " + _room);
            // Join the room to receive messages emitted by this pong game by ID
            socket.join(_room);

            // Now emit messages to everyone else in this room.
            io.sockets.in(_room).emit('joined');

            var event = new Event();
            event.ts = new Date().getTime();
            event.move = "Joined";
            event.player = _player;
            event.state = null;
            event.pongId = _room;

            eventServices.addEvent(event);
        });

        socket.on('disconnect', function (data) {
            // Drop out of the game
            socket.leave(_room);

            // Atomic update to game status
            console.log(_player + " left room " + _room);
            io.sockets.in(_room).emit('msg', _player + " left room " + _room);

            var event = new Event();
            event.ts = new Date().getTime();
            event.move = "Disconnected";
            event.player = _player;
            event.state = null;
            event.pongId = _room;

            eventServices.addEvent(event);
        });

        socket.on('direction', function (direction) {
            io.sockets.in(_room).emit('msg', 'Player ' + _player + ' moved their paddle ' + direction);
            var event = new Event();
            event.ts = new Date().getTime();
            event.move = direction;
            event.player = _player;
            event.state = null;
            event.pongId = _room;
        });
    });
};

module.exports = SocketServices;