const util = require('util')

var BALL_LIMIT = 10;
//Paddle total size is 1 + (end size * 2) to account for one middle block two ends
var PADDLE_END_SIZE = 2;
var PADDLE_LIMIT = BALL_LIMIT - PADDLE_END_SIZE;

var HashMap = require('hashmap');
var Pong = require('../models/pong');
var _pongs = new HashMap();
var _high = Number.NaN;
var _low = Number.NaN;
var _currentPong = null;
var newPongState = {
    ball: {
        //0,0 represents center of our game grid
        x: 0,
        y: 0,
        moveX: 1,
        moveY: 0,
        speed: 1
    },
    //0 represents centered paddles
    paddleL: 0,
    paddleR: 0,
    scoreL: 0,
    scoreR: 0
};

function PongServices() {

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
        console.log(newPongState);
        console.log("Added pong: " + pong);
    } else {
    }
    _pongs.set(pong.id, {
        _id: pong.id,
        position: pong.position,
        active: pong.active,
        state: JSON.parse(JSON.stringify(newPongState))
    });
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
    var pong = this.getPongById(id);

    //Update paddle position first if valid player
    if (player === 1) {
        pong.state.paddleL = updatePaddle(movement, pong.state.paddleL);
    } else if (player === 2) {
        pong.state.paddleR = updatePaddle(movement, pong.state.paddleR);
    }

    //Move the ball by its current move numbers
    pong.state.ball.x += pong.state.ball.moveX;
    pong.state.ball.y += pong.state.ball.moveY;

    //Check ceiling collision, if the Y position is greater than the limit, switch our move angle
    if (Math.abs(pong.state.ball.y) >= BALL_LIMIT) {
        pong.state.ball.moveY *= -1;
    }

    //Check and perform paddle or wall collision
    if (Math.abs(pong.state.ball.x) >= BALL_LIMIT) {
        //Check if the paddle covers the current ball position, moveX < 0 could be paddleL, otherwise paddleR
        if (pong.state.ball.moveX < 0) {
            pong.state = performPaddleCollision(pong.state.paddleL, pong.state, true);
        } else {
            pong.state = performPaddleCollision(pong.state.paddleR, pong.state, false);
        }
    }

    return pong.state;
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

/**
 * Updates the paddle and returns its new position
 * @param movement
 * @param position
 * @returns new paddle position
 */
function updatePaddle(movement, position) {
    position += movement;
    //Check if the paddle would exceed the bounds of the board - if it would, just return the limit * movement
    //-1 downward movement will return the lower paddle limit
    if (Math.abs(position) > PADDLE_LIMIT) {
        return PADDLE_LIMIT * movement;
    } else {
        return position;
    }
}

function performPaddleCollision(paddle, state, left) {
    var ballRelLocation = state.ball.y - paddle;
    if (Math.abs(ballRelLocation) <= PADDLE_END_SIZE) {
        //Reverse direction
        state.ball.moveX *= -1;
        //Flat hit, no movement vertical movement
        if (ballRelLocation === 0) {
            state.ball.moveY = 0;
        } else {
            state.ball.moveY = ballRelLocation;
        }
    } else {
        //If we're checking the left paddle and it missed, update scoreR otherwise update scoreL
        if (left) {
            state.scoreR++;
        } else {
            state.scoreL++;
        }
        //On any score, reset the game position but set the ball moving away from the scorer
        var scoreL = state.scoreL;
        var scoreR = state.scoreR;
        state = JSON.parse(JSON.stringify(newPongState));
        state.scoreL = scoreL;
        state.scoreR = scoreR;

        if (left) {
            state.moveX = -1;
        } else {
            state.moveX = 1;
        }

        console.log(util.inspect(state, false, null))
    }
    return state;
}
module.exports = PongServices;