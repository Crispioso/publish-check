// Hello world NodeJS test
// const http = require('http');
// const hostname = '127.0.0.1';
// const port = 8081;
//
// http.createServer((req, res) => {
//    res.writeHead(200, { 'Content-Type': 'text/plain' });
// res.end('Hello World\n');
// }).listen(port, hostname, () => {
//    console.log('Server running at http://${hostname}:${port}/');
// });


/*
 * Variables and functions
 */
var express = require('express');
var app = express();
var request = require('request-json');
var client = request.createClient('https://www.ons.gov.uk/');
var Handlebars = require('handlebars');

// Build the handlebars templates with new pages
// function buildPage(json) {
//     console.log(json);
// }

// Get release calendar JSON
var getJSON = function(responseJSON) {
    var JSONObj = {};

    client.get('releasecalendar/data', function (err, res, body) {
        if (err) {
            return console.log('Error: ', err);
        }
        JSONObj = body;
        responseJSON(JSONObj);
    });
};

/*
* Compile handlebars templates
 */





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
    res.send('thing');
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