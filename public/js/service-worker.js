//============================================================================================
// SERVICE WORKER
//============================================================================================

//*********************************************************
// Receive messages
//*********************************************************
self.addEventListener('message', function(event){
    /* Set the technician id that created this service worker */
    var data = JSON.parse(event.data);
    console.log("SW received technician id: " + data.technician_id);
    self.technician_id = data.technician_id;
});

//*********************************************************
// Listen for push notification events
//*********************************************************
self.addEventListener("push", function(event){
    /* Retrieves the payload sent */
    var payload = event.data ? JSON.parse(event.data.text()) : 'no payload';

    console.log('push debugging payload: ');
    console.log(payload)
    // Temporarily hardcode self.technician_id = 1 to see if it fixes issue

    /* Only send push notification for the selected technician */
    if(payload.technician_id == 1) {
        /* Show a new message notification */
        event.waitUntil(
            self.registration.showNotification("Alert", {
                body: "You have been assigned to a customer!"
            })
        );
    }
});

//*********************************************************
// Fire when push notification is clicked
//*********************************************************
self.addEventListener("notificationclick", function(event){
    event.waitUntil(
        clients.openWindow("/")
    );
});