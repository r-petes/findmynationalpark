// Express tutorial: https://www.tutorialsteacher.com/nodejs/expressjs-web-application

const fetch = require('node-fetch');
const haversine = require('haversine-distance');
var express = require('express');
var app = express();


// Microservice formatting from https://github.com/AaronTrinh/Geocoding-Microservice/blob/main/client.js 
const zmq = require('zeromq');
// Socket to talk to the server.
console.log("Connecting to Geocoding server...");
const requester = zmq.socket('req');


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
        requester.send(enterLocation.toString());

        // Receive reply from the server.
        let result;
        requester.on("message", function (reply) {
        result = reply.toString();
            console.log(result)
        if(findmatches(result, searchRadius) == true) {
            res.sendFile(__dirname + '/searchresults.html');
        }
        else {
            res.sendFile(__dirname + '/searchfailed.html');
        }

        });


        // Set up server connection.
        requester.connect("tcp://localhost:5555");

        // Signal to end server.
        process.on('SIGINT', function () {
        requester.close();
        });
        
    
});

var server = app.listen(3000, function () {
    console.log('Node server is running..');
});


function findmatches(latlongresult, searchRadius){

    // Read data into variables. 
    // For each park, check distance
    var splitString = latlongresult.split(", ")
    var lat1 = parseFloat(splitString[0])
    var long1 = parseFloat(splitString[1])


    // // JSON file reading adapted from Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    // fetch('https://developer.nps.gov/api/v1/parks', {
    // headers: {
    //     'accept': 'application/json',
    //     'Authorization':'dqWgodPXhWoWgjtfThhrw6RHocpkb79IF7M3d2BH'
    // }})
    //     .then((response) => console.log(response))
    //     .then((data) => console.log(data));

    var lat2 = -105.2838511 
    var long2 = 40.0454736

    if(checkdistance(lat1, long1, lat2, long2, searchRadius) == true) {
        return true;
    }

};

function checkdistance(lat1, long1, lat2, long2, searchRadius){
  
    // Haversine formula library from https://www.npmjs.com/package/haversine-distance 
    const a = [lat1, long1]
    const b = [lat2, long2]
     
    distanceInMiles = haversine(a, b)/1609.344 // distance between points in miles

    if(distanceInMiles < searchRadius) {
        return true;
    }

};