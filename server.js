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
// Saving the endpoint information to memory
var pushSubscription;

// Express app
const app = express();

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
// ROUTES
//============================================================================================

//*********************************************************
// Subscribe a service worker to server
//*********************************************************
app.post("/subscription", function(req, res, next) {
  // Push api info
  pushSubscription = {
    endpoint: req.body.endpoint,
    keys: {
      p256dh: req.body.key,
      auth: req.body.authSecret
    }
  };
  console.log('Received the subscription info: ', pushSubscription);
  
  // Saves the endpoint and returns a 200 ok status
  res.status(200)
  	.json({
  		status: 'success',
  		message: 'Subscription info has been saved.'
  	});
});

//*********************************************************
// Dispatch push notification to service worker
//*********************************************************
app.post("/message", function(req, res, next) {

  // Get http request body info	
  var technicianId = req.body.technician_id;
  /* Payload to send with push notification */
  var payload = JSON.stringify({
    technician_id: technicianId
  });

  // Trigger a push notification if subscription is set
  if (pushSubscription) {
  	console.log('Sending the push notification with payload: ', payload);

    // Use the endpoint we saved earlier
    webPush.sendNotification(pushSubscription, payload).then(function(data) {
    	res.status(200)
		   .json({
		       status: 'success',
		       message: 'Push notification has been sent.'
		   });
    });
  }
});

// Start nodejs server
app.listen(process.env.PORT || 3000, function(){
  console.log("App listening on localhost:3000");
});