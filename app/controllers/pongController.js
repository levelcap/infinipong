const util = require('util');
var express = require('express');
var router = express.Router();
var Pong = require('../models/pong');
var PongServices = require('../services/pongServices');
var SocketServices = require('../services/socketServices');

function PongController() {

}

router.route('/')
    .get(function (req, res) {
        Pong.find(function (err, pongs) {
            if (err)
                res.send(err);
            res.json(pongs);
        });
    });

router.route('/start')
    .post(function (req, res) {
        var pongServices = new PongServices();
        return res.json(pongServices.startGame());
    });

router.route('/:pong_id')
    .get(function (req, res) {
        Pong.findById(req.params.pong_id, function (err, pong) {
            if (err)
                res.send(err);
            res.json(pong);
        });
    })
    .put(function (req, res) {
        Pong.findById(req.params.pong_id, function (err, pong) {
            if (err)
                res.send(err);

            pong.position = req.body.position;
            pong.activePlayers = req.body.activePlayers;

            pong.save(function (err) {
                if (err)
                    res.send(err);
                res.json({message: 'Pong ' + req.params.pong_id + ' updated!'});
            });
        });
    })
    .delete(function (req, res) {
        Pong.remove({_id: req.params.pong_id}, function (err, pong) {
            if (err)
                res.send(err);
            res.json({message: 'Pong ' + req.params.pong_id + ' successfully deleted'});
        });
    });

module.exports = router