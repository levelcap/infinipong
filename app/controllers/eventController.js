const logger = require('../cfg/logger')('infinipong');
const express = require('express');
const router = express.Router();
const Event = require('../models/event');

router.route('/').get(async (req, res) => {
  try {
    const events = await Event.find().limit(100).exec();
    return res.json(events);
  } catch (err) {
    logger.error('Unexpected error in GET /api/events', err);
    res.status(500).json(err);
  }
});

router.route('/:event_id').get(async (req, res) => {
  const eventId = req.params.event_id;
  try {
    const event = await Event.findById(eventId).exec();
    return res.json(event);
  } catch (err) {
    logger.error(`Unexpected error in GET /api/events/${eventId}`, err);
    res.status(500).json(err);
  }
});

module.exports = router