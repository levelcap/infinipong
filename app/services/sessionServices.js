var Session = require('../models/session');
var SocketServices = require('../services/socketServices')

function SessionServices() {

}

/**
 * Get and update the next position atomically
 */
SessionServices.prototype.getAndUpdateNextPosition = function (pong, thisPlayer, callback, self, startCallback) {
    Session.findOne({'active': true}, function (err, session) {
        if (err) {
            console.error(err);
            callback(pong, thisPlayer, self, startCallback);
        }
        if (session === null) {
            callback(pong, thisPlayer, self, startCallback);
        } else {
            //If the absolute value of nextLeftPosition is less than that of nextRightPosition, use nextLeftPosition
            var position = (Math.abs(session.nextLeftPosition) < Math.abs(session.nextRightPosition)) ? session.nextLeftPosition : session.nextRightPosition;
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
            pong.position = position;
            callback(pong, thisPlayer, self, startCallback);
        }
    });
};

SessionServices.prototype.getActiveSession = function(callback, self, startCallback) {
    Session.findOne({'active': true}, function (err, session) {
        if (err) {
            console.error(err);
            callback(null, self);
        }
        if (session === undefined) {
            callback(null, self, startCallback);
        } else {
            callback(session, self, startCallback);
        }
    });
};

/**
 * Updates the score for our active Session, incrementing the scores by the passed values
 * @param leftScoreChange
 * @param rightScoreChange
 * @return updated Session
 */
SessionServices.prototype.updateScore = function(leftScoreChange, rightScoreChange, callback, self) {
     var that = this;
     Session.update({active : true}, {$inc: {scoreL: leftScoreChange, scoreR: rightScoreChange}}, function(err) {
        if (err) {
            console.error(err);
        }
        that.getActiveSession(callback, self, null);
    });
};

SessionServices.prototype.startSession = function(callback, self, startCallback) {
    var session = new Session();
    session.scoreL = 0;
    session.scoreR = 0;
    session.nextLeftPosition = -1;
    session.nextRightPosition = 0;
    session.active = true;

    session.save(function (err, session) {
        if (err) {
            console.error(err);
        }
        var socketServices = new SocketServices();
        socketServices.start();
        callback(self, startCallback);
    });
};


module.exports = SessionServices;