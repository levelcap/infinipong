var EventServices = require('../services/eventServices');
var PongServices = require('../services/pongServices');
var Event = require('../models/event');

function SocketServices(io) {
    this.io = io;
}

SocketServices.prototype.start = function () {
    var io = this.io;
    var eventServices = new EventServices();
    var pongServices = new PongServices();

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
            var movement = 1;
            if (direction === "down") {
                movement = -1;
            }
            var event = new Event();
            event.ts = new Date().getTime();
            event.move = direction;
            event.player = _player;
            event.state = pongServices.updatePong(_room, _player, movement);
            event.pongId = _room;

            eventServices.addEvent(event);
            io.sockets.in(_room).emit('msg', 'Player ' + _player + ' moved their paddle ' + direction);
        });

        socket.on('update', function () {
            var event = new Event();
            event.ts = new Date().getTime();
            event.move = null;
            event.player = null;
            event.state = pongServices.updatePong(_room, null, null);
            event.pongId = _room;

            eventServices.addEvent(event);
            var stateMessage = "Ball = " + event.state.ball.x + "," + event.state.ball.y + "; Score = L: " + event.state.scoreL + " -  R:" + event.state.scoreR;
            io.sockets.in(_room).emit('msg', stateMessage);
        });
    });
};

module.exports = SocketServices;