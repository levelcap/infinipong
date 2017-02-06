var Session = require('../models/session');
var SocketServices = require('../services/socketServices')

function SessionServices() {

}

/**
 * Retrieve the position number we should use for our next game
 */
SessionServices.prototype.getNextPosition = function () {
    Session.findOne({'active': true}, function (err, session) {
        if (err) {
            console.error(err);
            return 0;
        }
        if (session === null) {
            return 0;
        } else {
            //If the absolute value of nextLeftPosition is less than that of nextRightPosition, use nextLeftPosition
            return (Math.abs(session.nextLeftPosition) < Math.abs(nextRightPosition)) ? session.nextLeftPosition : session.nextRightPosition;
        }
    });
};

/**
 * Update the next position based on the new game
 * @param left
 */
SessionServices.prototype.updateNextPosition = function(pong) {
    if (pong.position >= 0) {
        Session.update({active : true}, {$inc: {nextRightPosition: 1}}, function(err, result) {
            if (err) {
                console.error(err);
            }
        });
    } else {
        Session.update({active : true}, {$inc: {nextLeftPosition: -1}}, function(err, result) {
            if (err) {
                console.error(err);
            }
        });
    }
};

/**
 * Get and update the next position atomically
 */
SessionServices.prototype.getAndUpdateNextPosition = function () {
    Session.findOne({'active': true}, function (err, session) {
        if (err) {
            console.error(err);
            return null;
        }
        if (session === null) {
            return null;
        } else {
            //If the absolute value of nextLeftPosition is less than that of nextRightPosition, use nextLeftPosition
            var position = (Math.abs(session.nextLeftPosition) < Math.abs(nextRightPosition)) ? session.nextLeftPosition : session.nextRightPosition;
            //TODO: Updates can be done more safely by checking that we are updating the document in the same state we think we are
            if (position >= 0) {
                Session.update({active : true}, {$inc: {nextRightPosition: 1}}, function(err) {
                    if (err) {
                        console.error(err);
                    }
                });
            } else {
                Session.update({active : true}, {$inc: {nextLeftPosition: -1}}, function(err) {
                    if (err) {
                        console.error(err);
                    }
                });
            }
            return position;
        }
    });
};

SessionServices.prototype.getActiveSession = function() {
    Session.findOne({'active': true}, function (err, session) {
        if (err) {
            console.error(err);
            return null;
        }
        return session;
    });
};

/**
 * Updates the score for our active Session, incrementing the scores by the passed values
 * @param leftScoreChange
 * @param rightScoreChange
 * @return updated Session
 */
SessionServices.prototype.updateScore = function(leftScoreChange, rightScoreChange) {
    Session.update({active : true}, {$inc: {scoreL: leftScoreChange, scoreR: rightScoreChange}}, function(err) {
        if (err) {
            console.error(err);
        }
        return this.getActiveSession();
    });
};

SessionServices.prototype.startSession = function() {
    var session = new Session();
    session.scoreL = 0;
    session.scoreR = 0;
    session.nextLeftPosition = -1;
    session.nextRightPosition = 0;
    session.active = true;

    session.save(function (err, session) {
        if (err) {
            console.error()
        }
        var socketServices = new SocketServices();
        socketServices.start();
    });
};


module.exports = SessionServices;