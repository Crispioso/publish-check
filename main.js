/*
 * Variables and functions
 */
var Promise = global.Promise || require('promise');
var express = require('express');
var hbs = require('hbs');
// var exphbs = require('express-handlebars');
// var hbs = exphbs.create({
//     defaultLayout   : 'main',
//     partialsDir     : 'view/partials/'
// });
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
* Set scheduler for running checks at 9:28am and 9:30am each weekday
 */


// 9:28am upcoming check
var prePublish = new schedule.RecurrenceRule();
prePublish.hour = 16;

var upcomingObj = {type: 'Upcoming type'};
var upcoming = schedule.scheduleJob(prePublish, function() {
    https.request(upcomingOptions, function(restRes) {
        if (restRes.statusCode != '200') {
            // res.render('home', {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"})
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

// var currentTime = Date.now();
// var upcoming = '{"currentTime": "' + currentTime + '"},';


// 9:30am published check and match with 9:28am data
var postPublish = new schedule.RecurrenceRule();
postPublish.hour = 16;

var publishedObj = {type: 'Published type'};
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
    // https.request(publishedOptions, function(restRes) {
    //     console.log('Status: ', restRes.statusCode);
    //     if (restRes.statusCode != '200') {
    //         res.render('home', {error: "Oh no, <a href='ons.gov.uk/releasecalendar'>ons.gov.uk/releasecalendar<a/> isn't responding"})
    //     } else {
    //         var result = '';
    //
    //         // build up string of the data on each chunk received
    //         restRes.on('data', function(chunk) {
    //             result += chunk;
    //         });
    //
    //         // When request is finished ...
    //         restRes.on('end', function() {
    //             console.log('Result: ', result);
    //
    //             // Turn string of data into object
    //             var jsonObj = JSON.parse(result);
    //
    //             // Compile object with handlebars
    //             res.render('home', {published: jsonObj});
    //         });
    //     }
    // }).end();
    // var jsonObj = [];
    // jsonObj.push(upcomingObj);
    // jsonObj.push(publishedObj);
    //
    // console.log(jsonObj);
    //
    // res.render('home', jsonObj);

    var jsonObj = {};
    jsonObj['upcoming'] = upcomingObj;
    jsonObj['published'] = publishedObj;

    console.log(jsonObj);

    res.render('home', jsonObj);
});

app.listen(port, function() {
    console.log('Server running on port ' + port);
});