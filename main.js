/*
 * Variables and functions
 */
var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
// var request = require('request-json');
var https = require('https');
// var http = require('http');
// var client = request.createClient('https://www.ons.gov.uk/');
// var Handlebars = require('handlebars');
// var result = undefined;
var port = 9090;
var options = {
    hostname: 'www.ons.gov.uk',
    path: '/releasecalendar/data',
    method: 'GET'
};

// Build the handlebars templates with new pages
// function buildPage(json) {
//     console.log(json);
// }

// Get release calendar JSON
// var getJSON = function(responseJSON) {
//     client.get('releasecalendar/data', function (err, res, body) {
//         if (err) {
//             return console.log('Error: ', err);
//         }
//         result = body;
//         responseJSON(body);
//     });
// };
//
// function completedGet() {
//     console.log(result);
// }



/*
* Compile handlebars templates
 */

// function handlebarsData(callback) {
//     var data = getJSON(compileHandlebars);
// }
//
// function compileHandlebars(callback) {
//     var template = Handlebars.compile("<html><head><title>Title thing</title></head><body>{{type}}</body></html>");
//
//     client.get('releasecalendar/data', function (err, res, body) {
//         if (err) {
//             return console.log('Error: ', err);
//         }
//         result = template(body);
//         callback();
//     });
// }
//
// function compiledComplete() {
//     console.log(result);
// }

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

/*NEW - USING EXPRESS HANDLEBARS */
app.engine('handlebars', exphbs({defaultLayout: 'main', layoutsDir: __dirname + '/views/layouts'}));
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    https.request(options, function(restRes) {
        console.log('Status: ', restRes.statusCode);
        var result = '';
        // build up string of the data on each chunk received
        restRes.on('data', function(chunk) {
            result += chunk;
        });

        // On end turn string to object and compile with handlebars
        restRes.on('end', function() {
            console.log('Result: ', result);
            var jsonObj = JSON.parse(result)
            res.render('home', {data: jsonObj})
        });
    }).end();
});

app.listen(port, function() {
    console.log('Server running on port ' + port);
});

  /* OLD SERVER */
// app.get('/', function (req, res) {
//     var html = compileHandlebars(compiledComplete);

//     console.log(compileHandlebars(compiledComplete));
//     // res.send(compileHandlebars(compiledComplete));
//     // console.log(compileHandlebars(compiledComplete));
//     res.send('meh');
//     // compileHandlebars(res.send(compiledComplete));
// });

// app.listen(8081, function () {
//     console.log('NodeJS server running on port 8081');
// });



// request
//     .get('https://www.ons.gov.uk/data')
//     .on('response', function(response) {
//         console.log(response.statusCode);
//         console.log(response.headers['content-type']);
//
//     });