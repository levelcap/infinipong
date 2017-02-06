const util = require('util');
var HashMap = require('hashmap');
var Pong = require('../models/pong');
var Event = require('../models/event');
var Session = require('../models/session');
var PongUtils = require('../utils/pongUtils');
var SocketUtils = require('../utils/socketUtils');
var EventServices = require('../services/eventServices');
var SessionServices = require('../services/sessionServices');
var SocketServices = require('../services/socketServices');

//We only need one instance of Session and Event services
var sessionServices = new SessionServices();
var eventServices = new EventServices();
var socketServices = new SocketServices();

//Store games to update on server ticks, we still go to MongoDB for inter-game communication
var _pongUtils = new HashMap();

function PongServices() {

}

PongServices.prototype.startGame = function (startCallback) {
    var self = this;
    //If we don't have an active session, start a new one
    sessionServices.getActiveSession(self.foundActiveSession.bind(self), startCallback);
};

PongServices.prototype.foundActiveSession = function(activeSession, startCallback) {
    var self = this;
    if (activeSession === null) {
        sessionServices.startSession(self.startSessionComplete.bind(self), startCallback);
    } else {
        self.startSessionComplete(startCallback)
    }
};

PongServices.prototype.startSessionComplete = function(startCallback) {
    var self = this;
    //See if we have an existing game that needs players
    var pong = self.getPongThatNeedsPlayers();

    //TODO: Keeping thisPlayer and activePlayers as separate values is silly
    var thisPlayer = 1;

    //If no game needs players, create a new one
    if (pong === null) {
        pong = new Pong();
        pong.activePlayers = [{paddle: "left"}];
        pong.paddleL = 0;
        pong.paddleR = 0;
        pong.balls = [];
        pong.needsPlayers = true;
        pong.updateTime = new Date().getTime();

        sessionServices.getAndUpdateNextPosition(pong, thisPlayer, self.completeStartGame.bind(this), startCallback);
    } else {
        //Add needed player based on activePlayer
        if (pong.activePlayers[0].paddle == "left") {
            pong.activePlayers.push({paddle: "right"});
        } else {
            pong.activePlayers.push({paddle: "left"});
        }
        pong.needsPlayers = true;
        pong.updateTime =  new Date().getTime();
        thisPlayer = 2;
        self.completeStartGame(pong, thisPlayer, startCallback);
    }
};

PongServices.prototype.completeStartGame = function(pong, thisPlayer, startCallback) {
    var self = this;
    pong.save(function (err, pong) {
        if (err) {
            console.error(err);
            return err;
        }
        self.addOrUpdateLatestPong(pong);
        socketServices.start(self);
        startCallback({message: 'Pong game saved!', pong: pong, player: thisPlayer});
    });
};

/**
 *
 * @param pong - Pong model to add or update
 */
PongServices.prototype.addOrUpdateLatestPong = function (pong) {
    if (_pongUtils.get(pong.id) == null) {
        var pongUtils = new PongUtils(pong, this);
        console.log("Starting game");
        pongUtils.start();
        _pongUtils.set(pong.id, pongUtils);
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
 * @returns a pong game that is missing a player or null
 */
PongServices.prototype.getPongThatNeedsPlayers = function () {
    _pongUtils.forEach(function(pongUtils) {
        if (pongUtils.pong.activePlayers.length === 1) {
            return pongUtils.pong;
        }
    });
    return null;
};

/**
 * Check if a score is a goal or if a ball should be added to an adjacent pong game.
 * @param moveX - Direction and amount of the move on the x-axis
 * @param pongUtils - Pong game state
 * @param ball - Information about the ball which scored
 */
PongServices.prototype.nextGameOrScore = function (moveX, pongUtils, ball) {
    var pong = pongUtils.pong;
    var nextGame = pong.position + moveX;
    var self = this;
    Pong.findOne({'position': nextGame}, function (err, nextPong) {
        if (err) {
            console.error(err);
        }
        if (nextPong == null) {
            //If we are moving to the left when the score occurs, increment the right team's score by 1
            if (moveX < 0) {
                sessionServices.updateScore(0, 1, this.scoreUpdateComplete.bind(self));
            } else {
                sessionServices.updateScore(1, 0, this.scoreUpdateComplete.bind(self));
            }
        } else {
            var nextPongUtils = self.getPongById(nextPong.id);
            //If this instance is managing that game, we can easily add a new ball
            if (nextPongUtils !== null) {
                nextPongUtils.addNewBall(ball);
            }

            else {
                //TODO: Need a mechanism to communicate between server instances if this instance is not handling the next game but it does exist in MongoDB
                console.log("The ball went to the void nooooo");
                //Possible solutions:
                // - maintain a ballQueue in Mongo with relatively frequent polling for new objects
                // - with socket.io establish a main server scheme that handles intergame communication with child servers responsible for their set of games
            }
        }
    });
};

PongServices.prototype.scoreUpdateComplete = function(session, self) {
    self.goal(pongUtils, session);
};

/**
 * Send a goal / score update
 * @param pongUtils - pong game where score occured
 */
PongServices.prototype.goal = function (pongUtils) {
    var pong = pongUtils.pong;
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = "Score";
    event.player = null;
    event.state = pong;
    event.pongId = pong.id;

    eventServices.addEvent(event);
    var goalMessage = "Goal! Score is now Left: " + session.scoreL + ", Right: " + session.scoreR;
    SocketUtils.getIo().sockets.in(pong.id).emit('goal', {
        scoreL: session.scoreL,
        scoreR: session.scoreR,
        msg: goalMessage
    });
};

/**
 * Emit a message about the current pong state once per tick
 * @param pongUtils - pong utils instance to send tick update for
 */
PongServices.prototype.tickComplete = function (pongUtils) {
    var pong = pongUtils.pong;
    var event = new Event();
    event.ts = new Date().getTime();
    event.move = null;
    event.player = null;
    event.state = pong;
    event.pongId = pong.id;

    eventServices.addEvent(event);
    var stateMessage = "Balls = " + JSON.stringify(pong.balls);
    SocketUtils.getIo().sockets.in(pong.id).emit('msg', stateMessage);
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