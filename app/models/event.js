const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const safe = {w: "majority", wtimeout: 100};

const EventSchema = new Schema({
    ts: Number,
    player: String,
    move: String,
    state: Schema.Types.Mixed,
    pongId: Schema.Types.ObjectId
}, {safe: safe});

module.exports = mongoose.model('Event', EventSchema);