var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SessionSchema = new Schema({
    scoreL: Number,
    scoreR: Number,
    nextLeftPosition: Number,
    nextRightPosition: Number,
    active: Boolean,
});

module.exports = mongoose.model('Session', SessionSchema);