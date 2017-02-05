const util = require('util');
var HashMap = require('hashmap');
var Pong = require('../models/pong');
var Event = require('../models/event');
var PongComponent = require('../components/pongComponent');
var EventServices = require('../services/eventServices');
var eventServices = new EventServices();

var _pongs = new HashMap();
var _high = Number.NaN;
var _low = Number.NaN;
var _currentPong = null;

var _scoreLeftTeam = 0;
var _scoreRightTeam = 0;
var _io = null;

function PongServices() {

}

function PongServices(io) {
    if (_io === null) {
        _io = io;
    }
}

PongServices.prototype.addOrUpdateLatestPong = function (pong, newPong) {
    _currentPong = pong;
    if (newPong) {
        var last = _currentPong.position;
        if (isNaN(_high) || _high < pong.position) {
            _high = last;
        }

        if (isNaN(_low) || _low > pong.position) {
            _low = last;
        }
        var pongComponent = new PongComponent(pong.id, pong.position, pong.active, this);
        pongComponent.start();
        _pongs.set(pong.id, pongComponent);
    } else {
        var pongComponent = _pongs.get(pong.id);
        pongComponent.setActive(2);
    }

};

PongServices.prototype.getPongs = function () {
    return _pongs;
};

PongServices.prototype.getPongById = function (id) {
    return _pongs.get(id);
};

/**
 * Update a pong game state based on paddle motion or server tick
 * @param id - ID of pong game to update
 * @param player - 1 if left paddle, 2 if right paddle, null for server tick
 * @param movement - 1 or -1 for paddle movement up or down, null for server ticks
 * @return state of the game
 */
PongServices.prototype.updatePong = function (id, player, movement) {
    var pongComponent = this.getPongById(id);
    pongComponent.updatePongComponentPlayer(player, movement);
    return pongComponent;
};

/**
 * Get the position number for the next game, alternating between boards appearing on the left or right
 * @returns position for next pong game as a number
 */
PongServices.prototype.getNextPosition = function () {
    //If we have not yet set a position, use the first position of 0
    if (_currentPong == null) {
        return 0;
    }
    //If our last game had a negative position, next position will be our highest position + 1 to switch sides
    else if (_currentPong.position < 0) {
        return _high + 1;
    }
    //If our last game had a positive position, next position will be our lowest position -1 to switch sides
    else {
        return _low - 1;
    }
};

PongServices.prototype.getCurrentPong = function () {
    return _currentPong;
};

PongServices.prototype.nextGameOrScore = function (moveX, pongComponent) {
    var nextGame = pongComponent.position + moveX;
    console.log("Looking for game at position: " + moveX);
    var self = this;
    console.log(this.toString());
    Pong.findOne({'position': nextGame}, function (err, pong) {
        if (err) {
            console.log(err);
        }
        if (pong == null) {
            if (moveX < 0) {
                _scoreRightTeam++;
            } else {
                _scoreLeftTeam++;
            }
            self.goal(pongComponent);
        } else {
            var nextPongComponent = self.getPongById(pong.id);
            console.log("Found pongComponent " + pongComponent + " updating with extra ball");
        }
    });
};

PongServices.prototype.goal = function (pongComponent) {
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = "Score";
    event.player = null;
    event.state = pongComponent;
    event.pongId = pongComponent.id;

    eventServices.addEvent(event);
    var goalMessage = "Goal! Score is now Left: " + _scoreLeftTeam + ", Right: " + _scoreRightTeam;
    _io.sockets.in(pongComponent.id).emit('goal', {scoreL: _scoreLeftTeam, scoreR: _scoreRightTeam, msg: goalMessage});
};

PongServices.prototype.tickComplete = function (pongComponent) {
    console.log(pongComponent);
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = null;
    event.player = null;
    event.state = pongComponent;
    event.pongId = pongComponent.id;

    eventServices.addEvent(event);
    var stateMessage = "Ball = " + pongComponent.ball.x + "," + pongComponent.ball.y + "; Score = L: " + _scoreLeftTeam + " -  R:" + _scoreRightTeam;
    _io.sockets.in(pongComponent.id).emit('msg', stateMessage);
}

module.exports = PongServices;