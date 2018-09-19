const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const config = require('./app/cfg/config');
const logger = require('./app/cfg/logger')('infinipong');

const port = config.port;
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const router = express.Router();
const socketServices = require('./app/services/socketServices');

mongoose.connect(config.mongo.url);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

router.use(function(req, res, next) {
  next();
});

router.get('/', function(req, res) {
  res.json({ message: 'Nothing here at the default route' });
});

app.use('/api/pongs', require('./app/controllers/pongController'));
app.use('/api/events', require('./app/controllers/eventController'));
app.use('/api', router);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

socketServices.setIo(io);
http.listen(port, function() {
  logger.info('listening on *:' + port);
});