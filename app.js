// Basic express routing sourced/adapted from express tutorial: https://www.tutorialsteacher.com/nodejs/expressjs-web-application
const fetch = require('node-fetch');
const haversine = require('haversine-distance');
var express = require('express');
var app = express();
app.set('view engine', 'ejs');


/// Microservice formatting adapted from https://github.com/AaronTrinh/Geocoding-Microservice/blob/main/client.js 
const zmq = require('zeromq');

// Socket to talk to the server.
console.log("Connecting to Geocoding server...");
const requester = zmq.socket('req');

// Set up server connection.
requester.connect("tcp://localhost:5555");

// Signal to end server.
process.on('SIGINT', function() {
    requester.close();
});


var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
    extended: false
}));

//  Render home page
app.get('/', function(req, res) {
    return res.render(__dirname + '/views/index.ejs');
});

// Render about page
app.get('/about', function(req, res) {
    return res.render(__dirname + '/views/about.ejs');
});

// Render search results page based on user input 
app.post('/searchresults', function(req, res, error) {
    const enterLocation = req.body.enterLocation;
    const searchRadius = req.body.searchRadius;

    // Send request to microservice server.
    requester.send(enterLocation.toString());

    // Receive reply from the server.
    var result;
    requester.on("message", function(reply) {
        result = reply.toString();

        // Parse the lat/long to 2 variables 
        var inputtedLatLong = parseInputtedLatLong(result)


        // Fetch API NPS data and find search matches
        findMatches(inputtedLatLong, searchRadius, res)
    });

});

// Confirm that server is operational
var server = app.listen(3000, function() {
    console.log('Node server is running..');
});


// Parse lat/long into separate variables 
function parseInputtedLatLong(latLongResult) {

    var splitString = latLongResult.split(", ")
    var lat1 = parseFloat(splitString[0])
    var long1 = parseFloat(splitString[1])

    return ([lat1, long1])
};


// Find the parks that match the search criteria using National Park Service API
function findMatches(inputtedLatLong, searchRadius, res) {

    var matches = []

    // User-Agent header addition sourced from https://www.jeyr.dev/posts/nps-api-403-error 
    // JSON file reading adapted from Fetch API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    fetch("https://developer.nps.gov/api/v1/parks?limit=600&api_key=dqWgodPXhWoWgjtfThhrw6RHocpkb79IF7M3d2BH", {
            headers: {
                'accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
            }
        })
        .then((response) => response.json())
        .then((data) => {


            // For each park, if the distance from the inputted zipcode matches inputted search radius condition, add to list
            for (eachPark in data["data"]) {
                parkLatLong = data["data"][eachPark]["latLong"]

                // Parse the lat/long to 2 variables
                parkLatLong = parseParkLatLong(parkLatLong)


                // Check whether the specific park matches search criteria
                const distance = checkDistance(inputtedLatLong, parkLatLong, searchRadius)

                // If the distance matches search criteria, add to list
                if (distance != false) {
                    addMatch(matches, data, eachPark, distance)
                }
            }

            // Render search results page with resulting parks
            res.render(__dirname + '/views/searchresults.ejs', {
                matches: matches
            })

        });
};

// Add park that meets the search criteria to list
function addMatch(matches, data, eachPark, distance){

    matches.push({
        "fullName": data["data"][eachPark]["fullName"],
        "description": data["data"][eachPark]["description"],
        "directionsInfo": data["data"][eachPark]["directionsInfo"],
        "distanceToPark": distance,
        "imageURL": data["data"][eachPark]["images"][0]["url"]
    })

    return

}

// Parse the park's JSON latitude/longitude into separate variables as floats
function parseParkLatLong(parkLatLong) {
    var splitString = parkLatLong.split(", ")
    var lat2 = splitString[0]
    var long2 = splitString[1]


    var splitLat2 = lat2.split(":")
    var splitLong2 = long2.split(":")

    lat2 = parseFloat(splitLat2[1])
    long2 = parseFloat(splitLong2[1])

    return ([lat2, long2])
}

// Check whether the specific park matches search criteria
function checkDistance(inputtedLatLong, parkLatLong, searchRadius) {
   
    var lat1 = inputtedLatLong[1]
    var long1 = inputtedLatLong[0]
    var lat2 = parkLatLong[0]
    var long2 = parkLatLong[1]

    // Haversine formula library use adapted from https://www.npmjs.com/package/haversine-distance 
    const a = {
        latitude: lat1,
        longitude: long1
    }
    const b = {
        latitude: lat2,
        longitude: long2
    }

    distanceInMiles = haversine(a, b) / 1609.344; // Calculate distance between points in miles

    // Return the distance between the two points if it is less than the desired search radius 
    if (distanceInMiles < searchRadius) {
        return distanceInMiles;
    } else {
        return false;
    }

};