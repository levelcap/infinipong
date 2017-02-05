var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PongSchema = new Schema({
    position: Number,
    activePlayers: Schema.Types.Mixed
});

module.exports = mongoose.model('Pong', PongSchema);