var BALL_LIMIT = 10;
//Paddle total size is 1 + (end size * 2) to account for one middle block two ends
var PADDLE_END_SIZE = 2;
var PADDLE_LIMIT = BALL_LIMIT - PADDLE_END_SIZE;
var _removeIdx = [];

/**
 * PongComponent constructor
 * @param id
 * @param position
 * @param activePlayers
 * @param pongServices
 * @constructor
 */
function PongComponent(id, position, activePlayers, pongServices) {
    this.id = id;
    this.position = position;
    this.activePlayers = activePlayers;
    this.balls = [{
        //0,0 represents center of our game grid
        x: 0,
        y: 0,
        moveX: 1,
        moveY: 0
    }];
    //0 represents centered paddles
    this.paddleL = 0;
    this.paddleR = 0;
    this.pongServices = pongServices;
}

/**
 * Start the game loop to update ball position
 */
PongComponent.prototype.start = function () {
    //Update the game on a fixed interval to handle ball movement and scoring separate from client commands
    var self = this;
    setInterval(function () {
        self.updatePongComponentBalls();
        //Emit updates via sockets
        self.pongServices.tickComplete(self);
    }, 1000);
};

/**
 * Resets the ball to its default position, moving away from the scorer
 * If there is an adjacent game we may also update the score via the nextGameOrScore method
 * @param moveX - Direction of ball movement after reset
 */
PongComponent.prototype.newPoint = function (moveX, ball) {
    //We only need to add a new ball if we have run out of balls in play
    if (_removeIdx.length === this.balls.length) {
        this.balls.push({
            x: 0,
            y: 0,
            moveX: moveX,
            moveY: 0,
        });
    }

    this.pongServices.nextGameOrScore(moveX, this, ball);
};

/**
 * Updates this pong component based on paddle motion
 * @param player - 1 if left paddle, 2 if right paddle
 * @param movement - 1 or -1 for paddle movement up or down
 * @return state of the game
 */
PongComponent.prototype.updatePongComponentPlayer = function (player, movement) {
    //Update paddle position first if valid player
    if (player === 1) {
        this.paddleL = this.updatePaddle(movement, this.paddleL);
    } else if (player === 2) {
        this.paddleR = this.updatePaddle(movement, this.paddleR);
    }
};

/**
 * Updates ball position for server tick, kicks off scoring and collisions if needed
 */
PongComponent.prototype.updatePongComponentBalls = function () {
    //Move the ball by its current move numbers
    var index = 0;
    var self = this;
    this.balls.forEach(function (ball) {
        ball.x += ball.moveX;
        ball.y += ball.moveY;

        //Check ceiling collision, if the Y position is greater than the limit, switch our move angle
        if (Math.abs(ball.y) >= BALL_LIMIT) {
            ball.moveY *= -1;
        }

        //Check and perform paddle or wall collision
        if (Math.abs(ball.x) >= BALL_LIMIT) {
            //Check if the paddle covers the current ball position, moveX < 0 could be paddleL, otherwise paddleR
            if (ball.moveX < 0) {
                self.performPaddleCollision(self.paddleL, true, ball, index);
            } else {
                self.performPaddleCollision(self.paddleR, false, ball, index);
            }
        }
        index++;
    });

    //Remove balls that have left play
    var self = this;
    _removeIdx.forEach(function (idx) {
        self.balls.splice(idx, 1);
    });

    //Blank remove array for next loop
    _removeIdx = [];
};

/**
 * Get the position number for the next game, alternating between boards appearing on the left or right
 * @returns position for next pong game as a number
 */
PongComponent.prototype.getNextPosition = function () {
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
 * Updates the paddle and returns its new position
 * @param movement
 * @param position
 * @returns new paddle position
 */
PongComponent.prototype.updatePaddle = function (movement, position) {
    position += movement;
    //Check if the paddle would exceed the bounds of the board - if it would, just return the limit * movement
    //-1 downward movement will return the lower paddle limit
    if (Math.abs(position) > PADDLE_LIMIT) {
        return PADDLE_LIMIT * movement;
    } else {
        return position;
    }
}

/**
 * Check if the ball has collided with a paddle or wall, score accordingly and update game state
 * @param paddle - Paddle position
 * @param left - Whether or not the paddle we are using is the left paddle
 * @param ball - Ball to check collision states for
 * @param index - Index of ball if we need to remove it after scoring
 */
PongComponent.prototype.performPaddleCollision = function (paddle, left, ball, index) {
    var ballRelLocation = ball.y - paddle;
    if (Math.abs(ballRelLocation) <= PADDLE_END_SIZE) {
        //Reverse direction
        ball.moveX *= -1;
        //Flat hit, no movement vertical movement
        if (ballRelLocation === 0) {
            ball.moveY = 0;
        } else {
            ball.moveY = ballRelLocation;
        }
    } else {
        //Ball has hit a wall, call the newPoint method which will determine if we've scored or moved the ball to the next game
        _removeIdx.push(index);
        if (left) {
            this.newPoint(-1, ball);
        } else {
            this.newPoint(1, ball);
        }
    }
}

/*
 * Add a new ball to this game from another game's goal
 * @param ball - Ball information from other game
 */
PongComponent.prototype.addNewBall = function (ball) {
    var newX = 0;
    if (ball.x < 0) {
        newX = (ball.x + 1) * -1;
    } else {
        newX = (ball.x - 1) * -1;
    }
    var newBall = {
        x: newX,
        y: ball.y,
        moveX: 1,
        moveY: ball.moveY
    };

    this.balls.push(newBall);
};
module.exports = PongComponent;