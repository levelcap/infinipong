const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PongSchema = new Schema({
    position: Number,
    activePlayers: Schema.Types.Mixed
});

module.exports = mongoose.model('Pong', PongSchema);