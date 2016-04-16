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
var port = 8081;
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
    var today = moment(dateString).format('D MMM YYYY')
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
var upcomingObj = {type: 'Upcoming type'};
var publishedObj = {type: 'Published type'};

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

            // Request published object
            https.request(publishedOptions, function(restRes) {
                console.log('Status: ', restRes.statusCode);
                if (restRes.statusCode != '200') {
                    publishedObj = {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"};
                } else {
                    var result = '';

                    // build up string of the data on each chunk received
                    restRes.on('data', function(chunk) {
                        result += chunk;
                    });

                    // When request is finished ...
                    restRes.on('end', function() {
                        // console.log('Published: ', result);

                        // Turn string of data into object
                        publishedObj = JSON.parse(result);

                        // Merge together two data objects
                        var jsonObj = {};
                        jsonObj['upcoming'] = upcomingObj;
                        jsonObj['published'] = publishedObj;
                        jsonObj['id'] = 'data'; // Id for loading data later

                        // Store data in a JSON file for records
                        store.add(jsonObj, function (err) {
                            if (err) {
                                throw err;
                            };
                        });
                    });
                }
            }).end();
        });
    }
}).end();


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
                console.log('Upcoming: ', result);

                // Turn string of data into object
                upcomingObj = JSON.parse(result);


            });
        }
    }).end();
});


// 9:30am published check and match with 9:28am data
var postPublish = new schedule.RecurrenceRule();
postPublish.hour = 9;
postPublish.minute = 30;

var published = schedule.scheduleJob(postPublish, function() {
    https.request(publishedOptions, function(restRes) {
        console.log('Status: ', restRes.statusCode);
        if (restRes.statusCode != '200') {
            publishedObj = {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"};
        } else {
            var result = '';

            // build up string of the data on each chunk received
            restRes.on('data', function(chunk) {
                result += chunk;
            });

            // When request is finished ...
            restRes.on('end', function() {
                console.log('Published: ', result);

                // Turn string of data into object
                publishedObj = JSON.parse(result);
            });
        }
    }).end();
});


/*
 * Start web server
 */
app.get('/', function (req, res) {

    // Merge together two data objects
    // var jsonObj = {};
    // jsonObj['upcoming'] = upcomingObj;
    // jsonObj['published'] = publishedObj;

    store.load('data', function (err, object) {
        // Render page
        res.render('home', object);
    });
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