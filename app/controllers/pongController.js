const util = require('util');
var express = require('express');
var router = express.Router();
var Pong = require('../models/pong');
var PongServices = require('../services/pongServices');
var SocketServices = require('../services/socketServices');

function PongController() {

}

router.route('/')
    .post(function (req, res) {
        var pong = new Pong();
        pong.position = req.body.position;
        pong.activePlayers = req.body.activePlayers;

        pong.save(function (err, pong) {
            if (err) {
                res.send(err);
            }
            var pongServices = new PongServices();
            pongServices.addPong(pong);
            res.json({message: 'Pong game created!', pong: pong});
        });
    })
    .get(function (req, res) {
        Pong.find(function (err, pongs) {
            if (err)
                res.send(err);
            res.json(pongs);
        });
    });

router.route('/start')
    .post(function (req, res) {
        //Starting a
        var socketServices = new SocketServices();
        var pongServices = new PongServices();
        var newPong = false;
        var pong = pongServices.getPongThatNeedsPlayers();
        var thisPlayer = 1;

        if (pong === null) {
            pong = new Pong();
            pong.position = pongServices.getNextPosition();
            pong.activePlayers = [{paddle: "left"}];
            newPong = true;
        } else {
            if (pong.activePlayers[0].paddle == "left") {
                pong.activePlayers.push({paddle: "right"});
            } else {
                pong.activePlayers.push({paddle: "left"});
            }
            thisPlayer = 2;
        }

        if (newPong) {
            pong.save(function (err, pong) {
                if (err) {
                    res.send(err);
                }
                pongServices.addOrUpdateLatestPong(pong, newPong);
                socketServices.start();
                res.json({message: 'Pong game created!', pong: pong, player: thisPlayer});
            });
        } else {
            Pong.findById(pong.id, function (err, respPong) {
                if (err)
                    console.error(err);

                respPong.activePlayers = pong.activePlayers;

                pong.save(function (err) {
                    if (err)
                        console.error(err);
                    res.json({message: 'Pong game update!', pong: pong, player: thisPlayer});
                });
            });
        }
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