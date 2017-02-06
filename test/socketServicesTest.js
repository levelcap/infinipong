var io = require('socket.io-client');

var socketURL = 'http://localhost:3000';

var options = {
    transports: ['websocket'],
    'force new connection': true
};

var game1Player1 = {room: 1, player: 1};
var game1Player2 = {room: 1, player: 2};
var game2Player1 = {room: 2, player: 1};
var game2Player2 = {room: 2, player: 2};

describe("Pong Server", function () {
    before(function() {
        //TODO: Sockets no longer start when server starts, to kick them off we need to POST to the api/start endpoint
    });

    it('Should emit joined message to all users', function (done) {
        //socket.emit('direction', direction);
        var client1 = io.connect(socketURL, options);
        var client2 = io.connect(socketURL, options);
        var client3 = io.connect(socketURL, options);
        var client4 = io.connect(socketURL, options);

        var clientsFinished = 0;

        client1.on('connect', function (data) {
            client1.emit('join', game1Player1);
        });

        client2.on('connect', function (data) {
            client2.emit('join', game1Player2);
        });

        client3.on('connect', function (data) {
            client3.emit('join', game2Player1);
        });

        client4.on('connect', function (data) {
            client4.emit('join', game2Player2);
        });

        var numConnections = 0;
        client1.on('joined', function () {
            numConnections++;

            if (numConnections >= 2) {
                clientFinished();
            }
        });

        client2.on('joined', function () {
            numConnections++;

            if (numConnections >= 2) {
                clientFinished();
            }
        });

        client3.on('joined', function () {
            numConnections++;

            if (numConnections >= 2) {
                clientFinished();
            }
        });

        client4.on('joined', function () {
            numConnections++;

            if (numConnections >= 2) {
                clientFinished();
            }
        });

        function clientFinished() {
            clientsFinished++;
            if (clientsFinished == 4) {
                done();
            }
        }
    });
});