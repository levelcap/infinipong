const util = require('util');
var express = require('express');
var router = express.Router();
var Pong = require('../models/pong');
var PongServices = require('../services/pongServices');

function PongController() {

}

router.route('/')
    .post(function (req, res) {
        var pong = new Pong();
        pong.position = req.body.position;
        pong.active = req.body.active;

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
        var pongServices = new PongServices();
        var newPong = false;
        var pong = pongServices.getCurrentPong();
        if (pong === null || pong.active === 2) {
            pong = new Pong();
            console.log("Position: " + pongServices.getNextPosition());
            pong.position = pongServices.getNextPosition();
            pong.active = 1;
            newPong = true;
            console.log("Creating a new pong that looks like: " + pong);
        } else {
            pong.active = 2;
        }

        pong.save(function (err, pong) {
            if (err) {
                res.send(err);
            }
            pongServices.addOrUpdateLatestPong(pong, newPong);
            res.json({message: 'Pong game created!', pong: pong});
        });
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
            pong.active = req.body.active;

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