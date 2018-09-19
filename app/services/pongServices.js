const logger = require('../cfg/logger')('infinipong');
const Pong = require('../models/pong');
const Event = require('../models/event');
const PongComponent = require('../components/pongComponent');
const eventServices = require('../services/eventServices');
const socketServices = require('../services/socketServices');

const _pongs = new Map();
const _pongsNeedPlayers = [];
let _high = Number.NaN;
let _low = Number.NaN;
let _currentPong = null;
let _scoreLeftTeam = 0;
let _scoreRightTeam = 0;

/**
 *
 * @param pong
 * @param newPong
 */
async function addOrUpdateLatestPong (pong, newPong) {
  _currentPong = pong;
  if (newPong) {
    const last = _currentPong.position;
    if (isNaN(_high) || _high < pong.position) {
      _high = last;
    }

    if (isNaN(_low) || _low > pong.position) {
      _low = last;
    }
    const pongComponent = new PongComponent(pong.id, pong.position, pong.activePlayers);
    pongComponent.start();
    _pongs.set(pong.id, pongComponent);
    //New pongs need a second player
    _pongsNeedPlayers.push(pong);
  } else {
    const pongComponent = _pongs.get(pong.id);
    //We only add players to the oldest pong that needs them, remove this from the pongsNeedPlayers array
    _pongsNeedPlayers.splice(0, 1);
  }
}

async function getPongs () {
  return _pongs;
}

async function getPongById (id) {
  return _pongs.get(id);
}

/**
 * Update a pong game state based on paddle motion or server tick
 * @param id - ID of pong game to update
 * @param player - 1 if left paddle, 2 if right paddle, null for server tick
 * @param movement - 1 or -1 for paddle movement up or down, null for server ticks
 * @return state of the game
 */
async function updatePong (id, player, movement) {
  const pongComponent = this.getPongById(id);
  pongComponent.updatePongComponentPlayer(player, movement);
  return pongComponent;
}

/**
 * Get the position number for the next game, alternating between boards appearing on the left or right
 * @returns position for next pong game as a number
 */
function getNextPosition () {
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
}

/**
 * Checks the needs players list and returns the oldest pong that requires a player, or null if none do
 * @returns the oldest pong game that is missing a player or null
 */
function getPongThatNeedsPlayers () {
  if (_pongsNeedPlayers != null && _pongsNeedPlayers.length > 0) {
    return _pongsNeedPlayers[0];
  } else {
    return null;
  }
}

/**
 * Updates games after removing the empty game, positions moved so scores can continue moving between games
 * @param emptyPosition - Game position to remove and update around
 */
async function updatePongsForEmptyGame (emptyPosition) {
  //First remove our empty game
  try {
    await Pong.remove({ position: emptyPosition }).exec();
    //If the empty position was less than zero, find all positions less than zero and update their position by +1
    if (emptyPosition < 0) {
      await Pong.update({ position: { $lt: emptyPosition } }, { $inc: { position: 1 } }, { multi: true }).exec();
    }
    //If the empty position was greater than zero, find all positions greater than zero and update their position by -1
    else {
      await Pong.update({ position: { $gt: emptyPosition } }, { $inc: { position: -1 } }, { multi: true }).exec();
    }
  } catch (err) {
    logger.error('Unexpected error in updatePongsForEmptyGame', err);
  }
}

/**
 * When a player disconnects, add the game to the list of games that need players.  Or remove it if that was the last player
 * @param id - id of game to update
 * @param player - player that left the game
 */
async function addPongToNeedsPlayersList (id, player) {
  const pongComponent = this.getPongById(id);
  if (pongComponent.activePlayers.length === 1) {
    await updatePongsForEmptyGame(pongComponent.position);
  } else {
    if (player === 1) {
      pongComponent.activePlayers = [{ paddle: "right" }];
    } else {
      pongComponent.activePlayers = [{ paddle: "left" }];
    }
    _pongsNeedPlayers.push(pongComponent);
  }
}

module.exports = {
  addOrUpdateLatestPong,
  getPongs,
  getPongById,
  updatePong,
  getNextPosition,
  getPongThatNeedsPlayers,
  updatePongsForEmptyGame,
  addPongToNeedsPlayersList,
};