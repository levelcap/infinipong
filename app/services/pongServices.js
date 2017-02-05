var HashMap = require('hashmap');
var _pongs = new HashMap();
var _high = Number.NaN;
var _low = Number.NaN;
var _currentPong = null;

function PongServices() {

}

PongServices.prototype.addOrUpdateLatestPong = function (pong, newPong) {
    _currentPong = pong;
    if (newPong) {
        var last = _currentPong.position;
        if (isNaN(_high) || _high < pong.position) {
            _high = last;
        }

        if (isNaN(_low) || _low > pong.position) {
            _low = last;
        }
        console.log("Added pong: " + pong);
    } else {
        console.log("Update pong: " + pong + " to add player.");
    }
    _pongs.set(pong.id, pong);
};

PongServices.prototype.getPongs = function () {
    return _pongs;
};

PongServices.prototype.getNextPosition = function () {
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
};

PongServices.prototype.getCurrentPong = function () {
    return _currentPong;
}

module.exports = PongServices;