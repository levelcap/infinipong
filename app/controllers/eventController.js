var express = require('express');
var router = express.Router();
var Event = require('../models/event');

router.route('/')
    .get(function (req, res) {
        Event.find(function (err, events) {
            if (err)
                res.send(err);
            res.json(events);
        });
    });

router.route('/:event_id')
    .get(function (req, res) {
        Event.findById(req.params.event_id, function (err, event) {
            if (err)
                res.send(err);
            res.json(event);
        });
    });

module.exports = router