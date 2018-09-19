const autoBind = require('auto-bind');
const socketServices = require('../services/socketServices');
const eventServices = require('../services/eventServices');
const Event = require('../models/event');

const BALL_LIMIT = 10;
//Paddle total size is 1 + (end size * 2) to account for one middle block two ends
const PADDLE_END_SIZE = 2;
const PADDLE_LIMIT = BALL_LIMIT - PADDLE_END_SIZE;
let _removeIdx = [];

/**
 * PongComponent constructor
 * @param id
 * @param position
 * @param activePlayers
 * @constructor
 */
class PongComponent {
  constructor (id, position, activePlayers) {
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
    autoBind(this);
  }

  start () {
    //Update the game on a fixed interval to handle ball movement and scoring separate from client commands
    const self = this;
    setInterval(async () => {
      self.updatePongComponentBalls();
      //Emit updates via sockets
      await this.tickComplete();
    }, 1000);
  }

  /**
   * Emit a message about the current pong state once per tick
   */
  async tickComplete () {
    const event = new Event({
      ts: new Date().getTime(),
      move: null,
      player: null,
      state: this,
      pongId: this.id,
    });
    await eventServices.addEvent(event);
    const stateMessage = "Balls = " + JSON.stringify(this.balls);
    socketServices.getIo().sockets.in(this.id).emit('msg', stateMessage);
  }


  /**
   * Send a goal / score update
   * @param pongComponent - pong game where score occured
   */
  async goal() {
    const event = new Event({
      ts: new Date().getTime(),
      move: 'Score',
      player: null,
      state: this,
      pongId: this.id,
    });
    await eventServices.addEvent(event);
    const goalMessage = "Goal! Score is now Left: " + _scoreLeftTeam + ", Right: " + _scoreRightTeam;
    socketServices.getIo().sockets.in(this.id).emit('goal', {
      scoreL: _scoreLeftTeam,
      scoreR: _scoreRightTeam,
      msg: goalMessage
    });
  }

  /**
   * Check if a score is a goal or if a ball should be added to an adjacent pong game.
   * @param moveX - Direction and amount of the move on the x-axis
   * @param pongComponent - Pong game state
   * @param ball - Information about the ball which scored
   */
  async nextGameOrScore (moveX, ball) {
    const nextGame = this.position + moveX;
    const self = this;
    try {
      const fetchedPong = await Pong.findOne({ position: nextGame }).exec();
      if (pong === null) {
        if (moveX < 0) {
          _scoreRightTeam++;
        } else {
          _scoreLeftTeam++;
        }
        self.goal(pongComponent);
      } else {
        const nextPongComponent = self.getPongById(pong.id);
        nextPongComponent.addNewBall(ball);
      }
    } catch (err) {
      logger.error('Unexpected error in nextGameOrScore', err);
    }
  }


  /**
   * Resets the ball to its default position, moving away from the scorer
   * If there is an adjacent game we may also update the score via the nextGameOrScore method
   * @param moveX - Direction of ball movement after reset
   */
  async newPoint (moveX, ball) {
    //We only need to add a new ball if we have run out of balls in play
    if (_removeIdx.length === this.balls.length) {
      this.balls.push({
        x: 0,
        y: 0,
        moveX: moveX,
        moveY: 0,
      });
    }
    await this.nextGameOrScore(moveX, this, ball);
  }

  /**
   * Updates this pong component based on paddle motion
   * @param player - 1 if left paddle, 2 if right paddle
   * @param movement - 1 or -1 for paddle movement up or down
   * @return state of the game
   */
  updatePongComponentPlayer (player, movement) {
    //Update paddle position first if valid player
    if (player === 1) {
      this.paddleL = this.updatePaddle(movement, this.paddleL);
    } else if (player === 2) {
      this.paddleR = this.updatePaddle(movement, this.paddleR);
    }
  }

  /**
   * Updates ball position for server tick, kicks off scoring and collisions if needed
   */
  updatePongComponentBalls () {
    //Move the ball by its current move numbers
    let index = 0;
    const self = this;
    this.balls.forEach((ball) => {
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
    _removeIdx.forEach((idx) => {
      self.balls.splice(idx, 1);
    });

    //Blank remove array for next loop
    _removeIdx = [];
  }

  /**
   * Updates the paddle and returns its new position
   * @param movement
   * @param position
   * @returns new paddle position
   */
  updatePaddle (movement, position) {
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
  performPaddleCollision (paddle, left, ball, index) {
    const ballRelLocation = ball.y - paddle;
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
  addNewBall (ball) {
    let newX = 0;
    if (ball.x < 0) {
      newX = (ball.x + 1) * -1;
    } else {
      newX = (ball.x - 1) * -1;
    }
    const newBall = {
      x: newX,
      y: ball.y,
      moveX: 1,
      moveY: ball.moveY
    };

    this.balls.push(newBall);
  };
}
module.exports = PongComponent;