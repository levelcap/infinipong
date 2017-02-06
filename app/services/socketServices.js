var EventServices = require('../services/eventServices');
var Event = require('../models/event');
var SocketUtils = require('../utils/socketUtils');
var _started = false;

function SocketServices() {

}

/**
 * Setup socket event listeners
 */
SocketServices.prototype.start = function (pongServices) {
    //Don't need to start twice
    if (_started) {
        return;
    }
    var io = SocketUtils.getIo();
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

            // Update to game status
            pongServices.addPongToNeedsPlayersList(_room, _player);
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
            var pongUtils = pongServices.updatePong(_room, _player, movement);
            var pong = pongUtils.pong;
            var event = new Event();
            event.ts = new Date().getTime();
            event.move = direction;
            event.player = _player;
            event.state = pong
            event.pongId = _room;
            eventServices.addEvent(event);
            console.log(pong);
            var resp = {
                msg: 'Player ' + _player + ' moved their paddle ' + direction,
                paddleL: pong.paddleL,
                paddleR: pong.paddleR
            };
            console.log(resp);
            io.sockets.in(_room).emit('directionResp', resp);
        });
    });
    _started = true;
};

SocketServices.prototype.isStarted = function () {
    return _started;
};

module.exports = SocketServices;