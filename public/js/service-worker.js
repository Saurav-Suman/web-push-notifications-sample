//============================================================================================
// SERVICE WORKER
//============================================================================================
/* For local storage */
importScripts('localforage.js');

//*********************************************************
// First event by service worker 
//*********************************************************
self.addEventListener('install', function(event) {
    console.log('Installing new service worker...');
    /* This will kick out the current active worker and activate itself */
    //self.skipWaiting();
});

//*********************************************************
// Receive messages
//*********************************************************
self.addEventListener('message', function(event){
    /* Set the data sent to this service worker */
    var data = JSON.parse(event.data);
});

//*********************************************************
// Listen for push notification events
//*********************************************************
self.addEventListener("push", function(event){
    /* Retrieves the payload sent */
    var payload = event.data ? JSON.parse(event.data.text()) : 'no payload';

    console.log('Received push event with payload: ', payload);

    // Get techId set from local storage
    event.waitUntil(localforage.getItem('key')
        .then(function(value) {
            /* Only send push notification for the selected technician */
            if(payload.technician_id == value) {
                /* Show a new message notification */
                self.registration.showNotification("Alert", {
                    body: "You have been assigned to a customer!"
                })
            }
        })
        .catch(function(err) {
            console.log(err);
        })
    );
});

//*********************************************************
// Fire when push notification is clicked
//*********************************************************
self.addEventListener("notificationclick", function(event){
    event.waitUntil(
        clients.openWindow("/")
    );
});