const logger = require('../cfg/logger')('infinipong');
const _ = require('lodash');
const express = require('express');
const router = express.Router();
const Pong = require('../models/pong');
const pongServices = require('../services/pongServices');
const socketServices = require('../services/socketServices');

const POSITIONS = {
  LEFT: 'left',
  RIGHT: 'right',
};

router.route('/').post(async (req, res) => {
  // Position and active players can both be 0, default to null for missing
  const position = _.get(req, 'body.position', null);
  const activePlayers = _.get(req, 'body.activePlayers', null);
  if (position === null || activePlayers === null) {
    return res.status(400);
  }

  const pong = new Pong({
    position: position,
    activePlayers: activePlayers,
  });

  try {
    await pong.save();

    pongServices.addPong(pong);
    return res.json({ message: 'Pong game created!', pong: pong });
  } catch (err) {
    logger.error(`Unexpected error in POST /api/pongs`, err);
    res.status(500).json(err);
  }
}).get(async (req, res) => {
  try {
    const pongs = await Pong.find({}).exec();
    return res.json(pongs);
  } catch (err) {
    logger.error('Unexpected error in GET /api/pongs', err);
    res.status(500).json(err);
  }
});

router.route('/start').post(async (req, res) => {
  //Starting a game of pong
  let newPong = false;
  let pong = pongServices.getPongThatNeedsPlayers();
  let thisPlayer = 1;

  if (pong === null) {
    pong = new Pong({
      position: pongServices.getNextPosition(),
      activePlayers: [{ paddle: POSITIONS.LEFT }],
    });
    newPong = true;
  } else {
    if (pong.activePlayers[0].paddle == POSITIONS.LEFT) {
      pong.activePlayers.push({ paddle: POSITIONS.RIGHT });
    } else {
      pong.activePlayers.push({ paddle: POSITIONS.LEFT });
    }
    thisPlayer = 2;
  }

  try {
    if (newPong) {
      await pong.save();
      await pongServices.addOrUpdateLatestPong(pong, newPong);
      socketServices.start();
      return res.json({ message: 'Pong game created!', pong: pong, player: thisPlayer });
    }
    const foundPong = await Pong.findById(pong.id).exec();
    foundPong.activePlayers = pong.activePlayers;
    await pong.save();
    res.json({ message: 'Pong game update!', pong: pong, player: thisPlayer });
  } catch (err) {
    console.log(err);
    logger.error('Unexpected error in POST /api/pongs/start', err);
    res.status(500).json(err);
  }
});

router.route('/:pong_id').get(async (req, res) => {
  try {
    const pong = await Pong.findById(pongId).exec();
    return res.json(pong);
  } catch (err) {
    logger.error(`Unexpected error in GET /api/pongs/${pongId}`, err);
    res.status(500).json(err);
  }
}).put(async (req, res) => {
  const pongId = req.params.pong_id;
  try {
    const pong = await Pong.findById(pongId).exec();
    pong.position = req.body.position;
    pong.activePlayers = req.body.activePlayers;
    await pong.save();
    return res.json({ message: `Pong ${pongId} updated!` });
  } catch (err) {
    logger.error(`Unexpected error in PUT /api/pongs/${pongId}`, err);
    res.status(500).json(err);
  }
}).delete(async (req, res) => {
  const pongId = req.params.pong_id;
  try {
    await Pong.remove({ _id: pongId }).exec();
    return res.json({ message: `Pong ${pongId} deleted!` });
  } catch (err) {
    logger.error(`Unexpected error in DELETE /api/pongs/${pongId}`, err);
    res.status(500).json(err);
  }
});

module.exports = router;