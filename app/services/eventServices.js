function EventServices() {

}

EventServices.prototype.addEvent = function(event) {
    event.save(function (err, event) {
        if (err) {
            console.err(err);
        }
    });
};

module.exports = EventServices;