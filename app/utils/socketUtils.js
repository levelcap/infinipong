module.exports = {
    _io: null,
    setIo : function(io) {
        _io = io;
    },
    getIo : function() {
        return _io;
    }
}