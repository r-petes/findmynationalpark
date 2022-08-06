// Express tutorial: https://www.tutorialsteacher.com/nodejs/expressjs-web-application
const fetch = require('node-fetch');
const haversine = require('haversine-distance');
var express = require('express');
var app = express();

/// Microservice formatting from https://github.com/AaronTrinh/Geocoding-Microservice/blob/main/client.js 
const zmq = require('zeromq');
// Socket to talk to the server.
console.log("Connecting to Geocoding server...");
const requester = zmq.socket('req');

// Set up server connection.
requester.connect("tcp://localhost:5555");

// Signal to end server.
process.on('SIGINT', function () {
requester.close();
});


var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/about', function (req, res) {
    res.sendFile(__dirname + '/about.html');
});

app.post('/searchresults', function (req, res) {  
    const enterLocation = req.body.enterLocation; 
    const searchRadius = req.body.searchRadius;
    console.log(searchRadius, enterLocation)

     // Send request to microservice server.
     requester.send(enterLocation.toString());

    // Receive reply from the server.
    var result;
    requester.on("message", function (reply) {
        result = reply.toString();

        // Parse the lat/long to 2 variables 
        var latLong = parseLatLongString(result)

        var lat1 = latLong[1]
        var long1 = latLong[0]
    
        // Fetch API NPS data and find matches
        const matches = findMatches(lat1, long1, searchRadius)
        res.sendFile(__dirname + '/searchresults.html')


    });
       
});


var server = app.listen(3000, function () {
    console.log('Node server is running..');
});


function parseLatLongString(latLongResult){

    // Read data into variables. 
    // For each park, check distance
    var splitString = latLongResult.split(", ")
    var lat1 = parseFloat(splitString[0])
    var long1 = parseFloat(splitString[1])

    return ([lat1, long1])
};



function findMatches(lat1, long1, searchRadius){

    // Received extremeley helpful advice and user-agent header from https://www.jeyr.dev/posts/nps-api-403-error 
    // JSON file reading adapted from Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    fetch('https://developer.nps.gov/api/v1/parks?api_key=dqWgodPXhWoWgjtfThhrw6RHocpkb79IF7M3d2BH', {
        headers: {
            'accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
        }})
            .then((response) => response.json())
            .then((data) => {

                var matches = []

                // for each park in parkslist, if distance matches input, add to dictionary
                // data["data"][eachpark]["addresses"][0]["postalCode"]
                // send through zipcode
                for(eachPark in data["data"]) {
                    parkLatLong = data["data"][eachPark]["latLong"]



                    // Parse the lat/long to 2 variables 
                    var splitString = parkLatLong.split(", ")
                    var lat2 = splitString[0]
                    var long2 = splitString[1]

                    var splitLat2 = lat2.split(":")
                    var splitLong2 = long2.split(":")
                    
                    lat2 = parseFloat(splitLat2[1])
                    long2 = parseFloat(splitLong2[1])

                    const distance = checkdistance(lat1, long1, lat2, long2, searchRadius)

                    if(distance != false) {
                        matches.push({
                            "fullName": data["data"][eachPark]["fullName"],
                            "description":  data["data"][eachPark]["description"],
                            "directionsInfo": data["data"][eachPark]["directionsInfo"],
                            "distanceToPark": distance
                        }) 
                    }
                }
                console.log(matches)
                return(matches)
            });

};

function checkdistance(lat1, long1, lat2, long2, searchRadius){
  
    // Haversine formula library from https://www.npmjs.com/package/haversine-distance 
    const a = [lat1, long1]
    const b = [lat2, long2]
     
    distanceInMiles = haversine(a, b)/1609.344; // distance between points in miles

    if(distanceInMiles < searchRadius) {
        return distanceInMiles;
    }

    else {
        return false;
    }

};