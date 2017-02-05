var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var safe = {w: "majority", wtimeout: 100};

var EventSchema = new Schema({
    ts: Number,
    player: String,
    move: String,
    state: Schema.Types.Mixed,
    pongId: Schema.Types.ObjectId
}, {safe: safe});

module.exports = mongoose.model('Event', EventSchema);