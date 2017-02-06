var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var port = process.env.PORT || 3000;
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var router = express.Router();
var SocketUtils = require('./app/components/socketUtils');

var dbuser = process.env.DBUSER;
var dbpass = process.env.DBPASS;
mongoose.connect('mongodb://' + dbuser + ':' + dbpass + '@ds143539.mlab.com:43539/infinipong');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

router.use(function (req, res, next) {
    // do logging
    console.log('An API request has been made');
    next(); // make sure we go to the next routes and don't stop here
});

router.get('/', function (req, res) {
    res.json({message: 'Nothing here at the default route'});
});

app.use('/api/pongs', require('./app/controllers/pongController'))
app.use('/api/events', require('./app/controllers/eventController'))
app.use('/api', router);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

SocketUtils.setIo(io);

http.listen(port, function () {
    console.log('listening on *:' + port);
});