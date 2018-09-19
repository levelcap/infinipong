const io = require('socket.io-client');

const socketURL = 'http://localhost:3000';

const options = {
  transports: ['websocket'],
  'force new connection': true
};

const game1Player1 = { room: 1, player: 1 };
const game1Player2 = { room: 1, player: 2 };
const game2Player1 = { room: 2, player: 1 };
const game2Player2 = { room: 2, player: 2 };

describe("Pong Server", function() {
  it('Should emit joined message to all users', function(done) {
    try {
      //socket.emit('direction', direction);
      const client1 = io.connect(socketURL, options);
      const client2 = io.connect(socketURL, options);
      const client3 = io.connect(socketURL, options);
      const client4 = io.connect(socketURL, options);

      let clientsFinished = 0;

      client1.on('connect', function(data) {
        console.log('client1');
        client1.emit('join', game1Player1);
      });

      client2.on('connect', function(data) {
        console.log('client2');
        client2.emit('join', game1Player2);
      });

      client3.on('connect', function(data) {
        console.log('client3');
        client3.emit('join', game2Player1);
      });

      client4.on('connect', function(data) {
        console.log('client4');
        client4.emit('join', game2Player2);
      });

      let numConnections = 0;
      client1.on('joined', function() {
        console.log('client1 joined');
        numConnections++;

        if (numConnections >= 2) {
          clientFinished();
        }
      });

      client2.on('joined', function() {
        console.log('client2 joined');
        numConnections++;

        if (numConnections >= 2) {
          clientFinished();
        }
      });

      client3.on('joined', function() {
        numConnections++;

        if (numConnections >= 2) {
          clientFinished();
        }
      });

      client4.on('joined', function() {
        numConnections++;
        if (numConnections >= 2) {
          clientFinished();
        }
      });

      function clientFinished () {
        console.log('Here');
        clientsFinished++;
        if (clientsFinished == 4) {
          done();
        }
      }
    } catch (err) {
      console.log(err);
      done(err);
    }
  });
});