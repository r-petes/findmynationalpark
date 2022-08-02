// Express tutorial: https://www.tutorialsteacher.com/nodejs/expressjs-web-application

var express = require('express');
var app = express();

// Microservice formatting from https://github.com/AaronTrinh/Geocoding-Microservice/blob/main/client.js 
const zmq = require('zeromq');
// Socket to talk to the server.
console.log("Connecting to Geocoding server...");
const requester = zmq.socket('req');

// urllib usage from https://www.npmjs.com/package/urllib
const { request } = require('urllib');


var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/about', function (req, res) {
    res.sendFile(__dirname + '/about.html');
});

app.post('/searchresults', function (req, res) {  
    var enterLocation = req.body.enterLocation; 
    var searchRadius = req.body.searchRadius;
    console.log(searchRadius, enterLocation)

        // Send request to microservice server.
        // String: Can be an address, zip code, city, etc.
        // This can be modified to send a variable holding the zip code entered by the user.
        requester.send(enterLocation.toString());

        // Receive reply from the server.
        // Currently outputs the response to the console.
        // Can be modified to save the result to a variable.
        let result;
        requester.on("message", function (reply) {
        console.log("Received reply", ": [", reply.toString(), ']');
        result = reply.toString();
        });

        // Set up server connection.
        requester.connect("tcp://localhost:5555");

        // Signal to end server.
        process.on('SIGINT', function () {
        requester.close();
        });
        
    res.sendFile(__dirname + '/searchresults.html');
});

var server = app.listen(3000, function () {
    console.log('Node server is running..');
});