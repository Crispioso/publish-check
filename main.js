/*
 * Variables and functions
 */
var Promise = global.Promise || require('promise');
var express = require('express');
var hbs = require('hbs');
var fs = require('fs');
var partialsDir = __dirname + '/views/partials';
var filenames = fs.readdirSync(partialsDir);
var app = express();
var https = require('https');
var port = 8088;
var publishedOptions = {
    hostname: 'www.ons.gov.uk',
    path    : '/releasecalendar/data',
    method  : 'GET'
};
var upcomingOptions = {
    hostname: 'www.ons.gov.uk',
    path    : '/releasecalendar/data?view=upcoming',
    method  : 'GET'
};
var schedule = require('node-schedule');
var moment = require('moment');
var store = require('json-fs-store')('data');


// Get dates and time
var date = new Date();
date = date.toISOString();
var today = moment(date).format('D MMM YYYY');
console.log(today);


/*
 * Set up handlebars templating and partials
 */

// Register all partials (registerPartials not working for some reason)
filenames.forEach(function (filename) {
    var matches = /^([^.]+).handlebars$/.exec(filename);
    if (!matches) {
        return;
    }
    var name = matches[1];
    var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
    hbs.registerPartial(name, template);
});

app.engine('handlebars', require('hbs').__express);
app.set('view engine', 'handlebars');


/*
* Register custom handlebars helpers
*/

// Format from ISO date format
hbs.registerHelper('dateDay', function(dateString) {
    var today = moment(dateString).format('D MMM YYYY');
    return today;
});

// Todays date (no time)
hbs.registerHelper('today', function() {
    return today;
});

// If strings match
hbs.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
});

// If all true
hbs.registerHelper('if_all', function() {
    var args = [].slice.apply(arguments);
    var opts = args.pop();

    var fn = opts.fn;
    for(var i = 0; i < args.length; ++i) {
        if(args[i])
            continue;
        fn = opts.inverse;
        break;
    }
    return fn(this);
});


/*
* Get upcoming and published data on start of app
*/
var upcomingObj = {};
var publishedObj = {
    id      : "data",
    results : []
};

// Request upcoming object
https.request(upcomingOptions, function(restRes) {
    if (restRes.statusCode != '200') {
        upcomingObj = {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"};
    } else {
        var result = '';

        // build up string of the data on each chunk received
        restRes.on('data', function(chunk) {
            result += chunk;
        });

        // When request is finished ...
        restRes.on('end', function() {
            // console.log('Upcoming: ', result);
            // Turn string of data into object
            upcomingObj = JSON.parse(result);
        });
    }
}).end();


// Get published from stored JSON file
store.load('data', function(err, object) {
    if (err) {
        throw err;
    } else {
        publishedObj = object;
    }
});


/*
* Set scheduler for running checks at 9:28am and 9:30am each weekday
 */

// 9:28am upcoming check
var prePublish = new schedule.RecurrenceRule();
prePublish.hour = 9;
prePublish.minute = 28;

var upcomingSchedule = schedule.scheduleJob(prePublish, function() {
    https.request(upcomingOptions, function(restRes) {
        if (restRes.statusCode != '200') {
            upcomingObj = {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"};
        } else {
            var result = '';

            // build up string of the data on each chunk received
            restRes.on('data', function(chunk) {
                result += chunk;
            });

            // When request is finished ...
            restRes.on('end', function() {
                // Turn string of data into object
                upcomingObj = JSON.parse(result);
            });
        }
    }).end();
});

// Store todays upcoming release/s in an object for checking at 9:30am
var storeUpcomingToday = new schedule.RecurrenceRule();
storeUpcomingToday.hour = 9;
storeUpcomingToday.minute = 29;
// storeUpcomingToday.hour = 22;
// storeUpcomingToday.second = [0, 15, 30, 45];

// upcomingToday object
// var upcomingToday = [];

var storeUpcoming = schedule.scheduleJob(storeUpcomingToday, function() {
    var results = upcomingObj.result.results;
    var resultsLen = 0;
    var releaseDate = '';
    var releaseDay = '';
    // var upcomingTodayIndex = 0;

    for (var i = 0, len = results.length; i < len; i++) {
        // today = '19 Apr 2016';
        releaseDate = results[i]['description']['releaseDate'];
        releaseDay = moment(releaseDate).format('D MMM YYYY');
        // console.log("Today: ", today);
        // console.log("Release day: ", releaseDay);
        if (releaseDay == today) {
            publishedObj['results'].push(results[i]);
          // upcomingToday.push(results[i]);
            // upcomingTodayIndex = upcomingTodayIndex + 1;
            // upcomingToday[upcomingTodayIndex] = results[i];
        }
    }
    console.log('ran storeUpcoming');
    console.log(publishedObj['results']);
});

// 9:30am published check and match with 9:28am data
var publish = new schedule.RecurrenceRule();
publish.hour = 9;
publish.minute = 30;
publish.second = [1, 10, 20, 30, 40, 50];
// publish.hour = 22;
// publish.second = [3, 18, 33, 48];

// publishedObj['results'] = upcomingToday;

var published = schedule.scheduleJob(publish, function() {
    // Go through each result in upcomingToday at 9:30 and check it for the 'published' flag
    // var upcomingTodayLen = Object.keys(upcomingToday).length + 1;
    var upcomingTodayLen = Object.keys(publishedObj['results']).length;
    var path = '';

    for(var i = 0; i < upcomingTodayLen; i++) {
        // Get path of release item
        path = publishedObj['results'][i]['uri'] + '/data';
        publishedOptions['path'] = path;

        var index = i; // TODO this might not be necessary - test then delete and test again

        // Only do request if pubishedTime not added into object already
        if (!publishedObj['results'][i]['publishedTime']) {

          (function(callback) {
            // Make request to release item page
            https.request(publishedOptions, function(restRes, index) {
                var result = '';

                // build up string of the data on each chunk received
                restRes.on('data', function(chunk) {
                    result += chunk;
                });

                // Get callback (ie index number)
                var loopIndex = callback;

                // When request is finished ...
                restRes.on('end', function() {
                    // Turn string of data into object
                    result = JSON.parse(result);

                    if (result.description.published) {
                        // Store the current time and date
                        var time = new Date().toISOString();

                        // Add publish time onto object
                        // result['publishedTime'] = time;

                        // Pass published time into the main publishedObj
                        publishedObj['results'][loopIndex]['publishedTime'] = time;
                    } else if (!result.description.published) {
                        // Log that content isn't published yet
                        console.log(result.description.title + ' is not published yet');
                    }
                });
            }).end();
        })(index);
      }
    }
});

// At 9:31am mark any that aren't published as breached and store the data into the JSON file
var postPublish = new schedule.RecurrenceRule();
postPublish.hour = 9;
postPublish.minute = 31;
// postPublish.hour = 22;
// postPublish.second = [10, 25, 40, 55];

var storePublished = schedule.scheduleJob(postPublish, function() {
    // TODO flag content that hasn't got a publishedTime as breached

    store.add(publishedObj, function(err) {
        if (err) {
            throw err;
        }
    });

    // Build published from stored JSON instead now
    store.load('data', function(err, object) {
        if (err) {
            throw err;
        } else {
            publishedObj = object;
        }
    });
});


/*
 * Start web server
 */
app.get('/', function (req, res) {

    // Merge together two data objects
    var jsonObj = {};
    jsonObj['upcoming'] = upcomingObj;
    jsonObj['published'] = publishedObj;

    // Render page
    res.render('home', jsonObj);
});

// Return JSON data
app.get('/data', function (req, res) {
    // Set header
    res.setHeader('Content-Type', 'application/json');

    // Load stored JSON onto page
    store.load('data', function (err, object) {
        // console.log(object);
        res.send(object);
    });
});

app.listen(port, function() {
    console.log('Server running on port ' + port);
});