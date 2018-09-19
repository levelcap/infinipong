const logger = require('../cfg/logger')('infinipong');
const eventServices = require('../services/eventServices');
const pongServices = require('../services/pongServices');
const Event = require('../models/event');

let _started = false;
let _io;

function setIo(io) {
  _io = io;
}

function getIo() {
  return _io;
}

/**
 * Setup socket event listeners
 */
function start () {
  console.log('Starting');
  //Don't need to start twice
  if (_started) {
    return;
  }
  _io.on('connection', (socket) => {
    logger.info('a user connected');
    socket.on('disconnect', () => {
      logger.info('user disconnected');
    });
  });

  _io.sockets.on('connection', (socket) => {
    let _room, _player;
    socket.on('join', async (data) => {
      console.log(data);
      _room = data.room;
      _player = data.player;

      logger.info(`Adding socket ${socket} to room ${_room}`);
      // Join the room to receive messages emitted by this pong game by ID
      socket.join(_room);

      // Now emit messages to everyone else in this room.
      _io.sockets.in(_room).emit('joined');

      const event = new Event({
        ts: new Date().getTime(),
        move: 'Joined',
        player: _player,
        state: null,
        pongId: _room,
      });
      await eventServices.addEvent(event);
    });

    socket.on('disconnect', async (data) => {
      // Drop out of the game
      socket.leave(_room);

      // Update to game status
      await pongServices.addPongToNeedsPlayersList(_room, _player);
      _io.sockets.in(_room).emit('msg', `${_player} left room ${_room}`);

      const event = new Event({
        ts: new Date().getTime(),
        move: 'Disconnected',
        player: _player,
        state: null,
        pongId: _room,
      });
      await eventServices.addEvent(event);
    });

    socket.on('direction', async (direction) => {
      let movement = 1;
      if (direction === 'down') {
        movement = -1;
      }
      const event = new Event({
        ts: new Date().getTime(),
        move: direction,
        player: _player,
        state: pongServices.updatePong(_room, _player, movement),
        pongId: _room,
      });
      await eventServices.addEvent(event);

      const resp = {
        msg: `Player ${_player} moved their paddle ${direction}`,
        paddleL: event.state.paddleL,
        paddleR: event.state.paddleR
      };
      _io.sockets.in(_room).emit('directionResp', resp);
    });
  });
  _started = true;
}

function isStarted () {
  return _started;
}

module.exports = {
  setIo,
  getIo,
  start,
  isStarted,
};