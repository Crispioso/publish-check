var express = require('express'),
    app = express(),
    port = 3000,
    fetch = require('node-fetch'),
    Promise = require('promise'),
    data;

fetch.Promise = Promise;


function getUpcoming(customUrl) {
    var url = customUrl ? customUrl : 'https://www.ons.gov.uk/releasecalendar/data?view=upcoming';

    fetch(url)
        .then(function(response) {
            return response.json();
        }).then(function(json) {
            data = stripUpcomingData(json);
        });

    function stripUpcomingData(json) {
        var noOfReleases = json.result.results.length,
            strippedArr = [],
            i;

        for (i = 0; i < noOfReleases; i++) {
            var currentObj = {};

            currentObj.title = json.result.results[i].description.title;
            currentObj.releaseDate = json.result.results[i].description.releaseDate;
            currentObj.uri = json.result.results[i].uri;
            currentObj.isPublished = json.result.results[i].description.published;

            strippedArr[i] = currentObj;
        }

        return strippedArr;
    }
}

function checkPublished(upcomingReleases) {
    console.log('check those release yo!');
};


getUpcoming();


app.get('/', function(req, res) {
    res.send(data);
});

app.listen(port, function () {
    console.log('Listening on port ' + port);
});