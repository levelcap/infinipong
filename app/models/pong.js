var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PongSchema = new Schema({
    position: Number,
    activePlayers: Schema.Types.Mixed,
    balls: Schema.Types.Mixed,
    paddleL: Number,
    paddleR: Number,
    needsPlayers: Boolean,
    updateTime: Number
});

module.exports = mongoose.model('Pong', PongSchema);