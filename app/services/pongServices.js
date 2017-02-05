const util = require('util');
var HashMap = require('hashmap');
var Pong = require('../models/pong');
var Event = require('../models/event');
var PongComponent = require('../components/pongComponent');
var SocketComponent = require('../components/socketComponent');
var EventServices = require('../services/eventServices');
var eventServices = new EventServices();

var _pongs = new HashMap();
var _pongsNeedPlayers = [];
var _high = Number.NaN;
var _low = Number.NaN;
var _currentPong = null;

var _scoreLeftTeam = 0;
var _scoreRightTeam = 0;

function PongServices() {

}

/**
 *
 * @param pong
 * @param newPong
 */
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
        var pongComponent = new PongComponent(pong.id, pong.position, pong.activePlayers, this);
        pongComponent.start();
        _pongs.set(pong.id, pongComponent);
        //New pongs need a second player
        _pongsNeedPlayers.push(pong);
    } else {
        var pongComponent = _pongs.get(pong.id);
        //We only add players to the oldest pong that needs them, remove this from the pongsNeedPlayers array
        _pongsNeedPlayers.splice(0,1);
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

/**
 * Checks the needs players list and returns the oldest pong that requires a player, or null if none do
 * @returns the oldest pong game that is missing a player or null
 */
PongServices.prototype.getPongThatNeedsPlayers = function () {
    if (_pongsNeedPlayers != null && _pongsNeedPlayers.length > 0) {
        return _pongsNeedPlayers[0];
    } else {
        return null;
    }
};

/**
 * Check if a score is a goal or if a ball should be added to an adjacent pong game.
 * @param moveX - Direction and amount of the move on the x-axis
 * @param pongComponent - Pong game state
 * @param ball - Information about the ball which scored
 */
PongServices.prototype.nextGameOrScore = function (moveX, pongComponent, ball) {
    var nextGame = pongComponent.position + moveX;
    var self = this;
    Pong.findOne({'position': nextGame}, function (err, pong) {
        if (err) {
            console.error(err);
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
            nextPongComponent.addNewBall(ball);
        }
    });
};

/**
 * Send a goal / score update
 * @param pongComponent - pong game where score occured
 */
PongServices.prototype.goal = function (pongComponent) {
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = "Score";
    event.player = null;
    event.state = pongComponent;
    event.pongId = pongComponent.id;

    eventServices.addEvent(event);
    var goalMessage = "Goal! Score is now Left: " + _scoreLeftTeam + ", Right: " + _scoreRightTeam;
    SocketComponent.getIo().sockets.in(pongComponent.id).emit('goal', {
        scoreL: _scoreLeftTeam,
        scoreR: _scoreRightTeam,
        msg: goalMessage
    });
};

/**
 * Emit a message about the current pong state once per tick
 * @param pongComponent - pong game to send tick update for
 */
PongServices.prototype.tickComplete = function (pongComponent) {
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = null;
    event.player = null;
    event.state = pongComponent;
    event.pongId = pongComponent.id;

    eventServices.addEvent(event);
    var stateMessage = "Balls = " + JSON.stringify(pongComponent.balls);
    SocketComponent.getIo().sockets.in(pongComponent.id).emit('msg', stateMessage);
};

/**
 * When a player disconnects, add the game to the list of games that need players.  Or remove it if that was the last player
 * @param id - id of game to update
 * @param player - player that left the game
 */
PongServices.prototype.addPongToNeedsPlayersList = function(id, player) {
    var pongComponent = this.getPongById(id);
    if (pongComponent.activePlayers.length === 1) {
        this.updatePongsForEmptyGame(pongComponent.position);
    } else {
        if (player === 1) {
            pongComponent.activePlayers = [{paddle: "right"}];
        } else {
            pongComponent.activePlayers = [{paddle: "left"}];
        }
        _pongsNeedPlayers.push(pongComponent);
    }
};

/**
 * Updates games after removing the empty game, positions moved so scores can continue moving between games
 * @param emptyPosition - Game position to remove and update around
 */
PongServices.prototype.updatePongsForEmptyGame = function (emptyPosition) {
    //First remove our empty game
    Pong.remove({position: emptyPosition}, function (err, pong) {
        if (err)
            res.send(err);
    });

    //If the empty position was less than zero, find all positions less than zero and update their position by +1
    if (emptyPosition < 0) {
        Pong.update({
            position: {$lt: emptyPosition},
        }, {$inc: {position: 1}}, {multi: true}, function (err, result) {
            if (err)
                res.send(err);
        });
    }
    //If the empty position was greater than zero, find all positions greater than zero and update their position by -1
    else {
        Pong.update({
            position: {$gt: emptyPosition},
        }, {$inc: {position: -1}}, {multi: true}, function (err, result) {
            if (err)
                res.send(err);
        });
    }
};

module.exports = PongServices;