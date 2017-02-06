var chai = require('chai');
var assert = chai.assert;
var mongoose = require("mongoose");
var Pong = require("../app/models/pong");

mongoose.connect('mongodb://localhost/pong_test');
describe("Pong Model test", function(){
    //holds a pong model to use in the each test
    var currentPong = null;
    beforeEach(function(done){
        //add some test data
        currentPong = new Pong();
        currentPong.position = 0;
        currentPong.activePlayers = [];
        currentPong.balls = [];
        currentPong.needsPlayers = true;
        currentPong.paddleL = 0;
        currentPong.paddleR = 0;
        done();
    });

    afterEach(function(done){
        Pong.remove({}, function() {
            done();
        });
    });

    it("Adds a new pong", function(done){
        currentPong.save(function() {
            Pong.findOne({'position': 0}, function (err, pong) {
                assert.equal(pong.position, 0);
                done();
            });
        });
    });
});