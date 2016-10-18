"use strict";
//============================================================================================
// SETUP
//============================================================================================

// Npm modules
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const path = require("path");

// Web push module
const webPush = require('web-push');
// Firebase cloud messaging API key
webPush.setGCMAPIKey('AIzaSyDR39XdDP3O4QYeZtpqkWkgUI5GpsUFyAA');

// Express app
const app = express();

// CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	next();
});

// Set static file location
app.use(express.static('./public'));
// Log every request to console
app.use(logger('dev'));
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({'extended' : 'true'}));
// Parse application/json
app.use(bodyParser.json());
// Parse application/vnd.api+json as json
app.use(bodyParser.json({type:'application/vnd.api+json'}));

//============================================================================================
// DATABASE CONFIG
//============================================================================================

// Postgres promise library
var promise = require('bluebird');
var options = {
    // Initialization Options
    promiseLib: promise
};
var pgp = require('pg-promise')(options);
var connectionString;

var developmentMode = false;

if(developmentMode) {
	// Enter postgres credentials
    connectionString = 'postgres://postgres:password@localhost:5432/push-notifications';
} else {
    connectionString = process.env.DATABASE_URL;
    pgp.pg.defaults.ssl = true;
}
// Database promise object
var db = pgp(connectionString);

//============================================================================================
// ROUTES
//============================================================================================

//*********************************************************
// Lazy way to clear database (testing only)
//*********************************************************
app.get('/reset', function(req, res, next) {
	db.none('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;' +
		'CREATE TABLE gcm_registrations(ID SERIAL PRIMARY KEY, technician_id INTEGER, subscription_info VARCHAR);')
	.then(function() {
		res.status(200)
		.json({
			status: 'success',
			message: 'Your data has been reloaded.'
		});
	})
	.catch(function(err) {
		return next(err);
	})
});

//*********************************************************
// Log info on server side
//*********************************************************
app.get('/log', function(req, res, next) {
	if(pushSubscription) {
		console.log('The following subscription info is set on the server: ', pushSubscription);
	} else {
		console.log('No subscription info saved yet.')
	}
	res.status(200)
	  	.json({
	  		status: 'success',
	  		message: 'Logged info to server'
	  	});
});

//*********************************************************
// Subscribe a service worker to server
//*********************************************************
app.post("/subscription", function(req, res, next) {
  // Push api info
  var pushSubscription = {
    endpoint: req.body.endpoint,
    keys: {
      p256dh: req.body.key,
      auth: req.body.authSecret
    }
  };
  console.log('Received the subscription info: ', pushSubscription);

  // Save value in database
  db.none('INSERT INTO gcm_registrations (technician_id, subscription_info) VALUES ($1, $2)', 
  	[req.body.technician_id, pushSubscription])
        .then(function(data) {
          // Saves the endpoint and returns a 200 ok status
		  res.status(200)
		  	.json({
		  		status: 'success',
		  		message: 'Subscription info has been saved.'
		  	});  
        })
        .catch(function(err) {
            return next(err);
        });
});

//*********************************************************
// Dispatch push notification to service worker
//*********************************************************
app.post("/message", function(req, res, next) {
  // Get http request body info	
  var technicianId = req.body.technician_id;

  // Retrieve endpoint information for the subscribed technician
  db.any('SELECT * FROM gcm_registrations WHERE technician_id = $1', 
  	[technicianId])
        .then(function(data) {

        	var registrations = data;

        	if(registrations.length != 0) {
				// Send to all technician endpoints (if they have multiple devices)
        		for(var i=0; i<registrations.length; i++) {
        			(function(index) {
        				/* Payload to send with push notification */
						var payload = JSON.stringify({
							technician_id: technicianId
						});
						var pushSubscription = JSON.parse(registrations[index].subscription_info);

						// Send push notification
					    webPush.sendNotification(pushSubscription, payload).then(function() {
					    	console.log('Sent the notification to endpoint: ' + pushSubscription.endpoint + ' with payload: ' + payload);
					    })
					    .catch(function(err) {
					    	// Log any errors
					    	console.log(err);
					    });
					    // After sending to all devices return success
				    	if(index == (registrations.length - 1)) {
					    	res.status(200)
							   .json({
							       status: 'success',
							       message: 'Push notifications have been sent.'
							   });
						}
					})(i);
				}
        	} else {
        		res.status(400).json({
			  		status: 'failure',
			  		message: 'No subscription info has been saved to server for this user. Please ensure service worker has been subscribed.'
			  	});
        	}
        })
        .catch(function(err) {
            return next(err);
        });
});

//============================================================================================
// START SERVER
//============================================================================================
app.listen(process.env.PORT || 3000, function(){
  console.log("App listening on localhost:3000");
});