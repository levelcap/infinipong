const util = require('util');
var HashMap = require('hashmap');
var Pong = require('../models/pong');
var Event = require('../models/event');
var Session = require('../models/session');
var PongUtils = require('../utils/pongUtils');
var SocketUtils = require('../utils/socketUtils');
var EventServices = require('../services/eventServices');
var SessionServices = require('../services/sessionServices');

//We only need one instance of Session and Event services
var sessionServices = new SessionServices();
var eventServices = new EventServices();

//Store games to update on server ticks, we still go to MongoDB for inter-game communication
var _pongUtils = new HashMap();

function PongServices() {

}

PongServices.prototype.startGame = function () {
    //If we don't have an active session, start a new one
    if (sessionServices.getActiveSession() == null) {
        sessionServices.startSession();
    }

    //See if we have an existing game that needs players
    var pong = this.getPongThatNeedsPlayers();

    //TODO: Keeping thisPlayer and activePlayers as separate values is silly
    var thisPlayer = 1;

    //If no game needs players, create a new one
    if (pong === null) {
        pong = new Pong();
        pong.activePlayers = [{paddle: "left"}];
        pong.position = sessionServices.getAndUpdateNextPosition();
    } else {
        //Add needed player based on activePlayer
        if (pong.activePlayers[0].paddle == "left") {
            pong.activePlayers.push({paddle: "right"});
        } else {
            pong.activePlayers.push({paddle: "left"});
        }
        thisPlayer = 2;
    }

    pong.save(function (err, pong) {
        if (err) {
            return err;
        }
        pongServices.addOrUpdateLatestPong(pong);
        socketServices.start();
        return {message: 'Pong game saved!', pong: pong, player: thisPlayer};
    });
};

/**
 *
 * @param pong - Pong model to add or update
 */
PongServices.prototype.addOrUpdateLatestPong = function (pong) {
    if (_pongUtils.get(pong.id) == null) {
        var pongUtils = new PongUtils(pong, this);
        pongUtils.start();
    } else {
        var pongUtils = _pongUtils.get(pong.id);
        pongUtils.pong.activePlayers = pong.activePlayers;
    }
};

PongServices.prototype.getPongById = function (id) {
    return _pongUtils.get(id);
};

/**
 * Update a pong game state based on paddle motion or server tick
 * @param id - ID of pong game to update
 * @param player - 1 if left paddle, 2 if right paddle, null for server tick
 * @param movement - 1 or -1 for paddle movement up or down, null for server ticks
 * @return state of the game
 */
PongServices.prototype.updatePong = function (id, player, movement) {
    var pongUtils = this.getPongById(id);
    pongUtils.updatePongPlayer(player, movement);
    return pongUtils;
};

/**
 * Find one pong in the DB that has an activePlayers size of 1
 * TODO: Order by update time so we get the game that has needed a player the longest
 * @returns a pong game that is missing a player or null
 */
PongServices.prototype.getPongThatNeedsPlayers = function () {
    Pong.findOne({activePlayers: {$size: 1}}, function (err, pong) {
        if (err) {
            console.error(err);
            return null;
        }
    });
    if (_pongsNeedPlayers != null && _pongsNeedPlayers.length > 0) {
        return _pongsNeedPlayers[0];
    } else {
        return null;
    }
};

/**
 * Check if a score is a goal or if a ball should be added to an adjacent pong game.
 * @param moveX - Direction and amount of the move on the x-axis
 * @param pongUtils - Pong game state
 * @param ball - Information about the ball which scored
 */
PongServices.prototype.nextGameOrScore = function (moveX, pongUtils, ball) {
    var nextGame = pongUtils.position + moveX;
    var self = this;
    Pong.findOne({'position': nextGame}, function (err, pong) {
        if (err) {
            console.error(err);
        }
        if (pong == null) {
            //If we are moving to the left when the score occurs, increment the right team's score by 1
            if (moveX < 0) {
                sessionServices.updateScore(0, 1);
            } else {
                sessionServices.updateScore(1, 0);
            }
            self.goal(pongUtils);
        } else {
            var nextPong = self.getPongById(pong.id);
            nextPong.addNewBall(ball);
        }
    });
};

/**
 * Send a goal / score update
 * @param pongUtils - pong game where score occured
 */
PongServices.prototype.goal = function (pongUtils) {
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = "Score";
    event.player = null;
    event.state = pongUtils;
    event.pongId = pongUtils.id;

    eventServices.addEvent(event);
    var goalMessage = "Goal! Score is now Left: " + _scoreLeftTeam + ", Right: " + _scoreRightTeam;
    SocketUtils.getIo().sockets.in(pongUtils.id).emit('goal', {
        scoreL: _scoreLeftTeam,
        scoreR: _scoreRightTeam,
        msg: goalMessage
    });
};

/**
 * Emit a message about the current pong state once per tick
 * @param pongUtils - pong game to send tick update for
 */
PongServices.prototype.tickComplete = function (pongUtils) {
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = null;
    event.player = null;
    event.state = pongUtils;
    event.pongId = pongUtils.id;

    eventServices.addEvent(event);
    var stateMessage = "Balls = " + JSON.stringify(pongUtils.balls);
    SocketUtils.getIo().sockets.in(pongUtils.id).emit('msg', stateMessage);
};

/**
 * When a player disconnects, add the game to the list of games that need players.  Or remove it if that was the last player
 * @param id - id of game to update
 * @param player - player that left the game
 */
PongServices.prototype.addPongToNeedsPlayersList = function (id, player) {
    var pongUtils = this.getPongById(id);
    if (pongUtils.activePlayers.length === 1) {
        this.updatePongsForEmptyGame(pongUtils.position);
    } else {
        if (player === 1) {
            pongUtils.activePlayers = [{paddle: "right"}];
        } else {
            pongUtils.activePlayers = [{paddle: "left"}];
        }
        _pongsNeedPlayers.push(pongUtils);
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