var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PongSchema = new Schema({
    position: Number,
    active: Number
});

module.exports = mongoose.model('Pong', PongSchema);