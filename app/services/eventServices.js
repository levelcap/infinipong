function EventServices() {

}

EventServices.prototype.addEvent = function(event) {
    event.save(function (err, event) {
        if (err) {
            console.log(err);
        }
        console.log("Event saved: " + event);
    });
};

module.exports = EventServices;