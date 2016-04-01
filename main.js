/*
 * Variables and functions
 */
var express = require('express');
var app = express();
var request = require('request-json');
var client = request.createClient('https://www.ons.gov.uk/');
var Handlebars = require('handlebars');
var result = undefined;

// Build the handlebars templates with new pages
// function buildPage(json) {
//     console.log(json);
// }

// Get release calendar JSON
function getJSON(responseJSON) {
    // client.get('releasecalendar/data', function (err, res, body) {
    //     if (err) {
    //         return console.log('Error: ', err);
    //     }
    //     responseJSON(body);
    // });
};



/*
* Compile handlebars templates
 */

// function handlebarsData(callback) {
//     var data = getJSON(compileHandlebars);
// }

function compileHandlebars(callback) {
    var template = Handlebars.compile("<html><head><title>Title thing</title></head><body>{{type}}</body></html>");

    client.get('releasecalendar/data', function (err, res, body) {
        if (err) {
            return console.log('Error: ', err);
        }
        result = template(body);
        callback();
    });
}

function compiledComplete() {
    console.log(result);
}

// var template = Handlebars.compile("<html><head><title>A title</title></head><body>{{type}}</body></html>");
// // var data = function(callback) {
// //         var newData = getJSON(function(responseJSON) {console.log(responseJSON);})
// //     callback(newData);
// //     };
// var data = function(callback) {
//     console.log(callback);
// };
// var result = template(getJSON(data));


/*
 * Start web server
  */
app.get('/', function (req, res) {
    // console.log(compileHandlebars(compiledComplete));
    // res.send(compileHandlebars(compiledComplete));
    console.log(compileHandlebars(compiledComplete));
    res.send('meh');
    // compileHandlebars(res.send(compiledComplete));
});

app.listen(8081, function () {
    console.log('NodeJS server running on port 8081');
});



// request
//     .get('https://www.ons.gov.uk/data')
//     .on('response', function(response) {
//         console.log(response.statusCode);
//         console.log(response.headers['content-type']);
//
//     });