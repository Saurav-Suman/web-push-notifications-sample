//============================================================================================
// SETUP OUR SERVICE WORKER
//============================================================================================
var endpoint;
var key;
var authSecret;

/* Checks for existence of service worker in the navigator object */
if ("serviceWorker" in navigator) {

    /* Registration returns a service worker promise object */
    navigator.serviceWorker.register("/js/service-worker.js")
        .then(function(registration) {

            /* Get subscription */
            return registration.pushManager.getSubscription()
                .then(function(subscription) {

                    /* If a subscription was found, return it */
                    if (subscription) {
                        // IF USER IS SUBSCRIBED WE SHOULD ALSO CHECK IF THEY ARE REGISTERED IN THE DATABASE!!!!!
                        console.log('User is already subscribed.')
                        return subscription;
                    }
                    /* Otherwise pass in argument required to subscribe and show visible notification to end user */
                    return registration.pushManager.subscribe({userVisibleOnly: true})
                        .then(function(subscription) {

                            console.log('Subscribing the user.')
                            /* Send message to service worker to set the technician id */
                            registration.active.postMessage(JSON.stringify({technician_id: technicianId}));

                            /* Retrieve encryption data required for payload transfer on chrome (must be chrome v.50+) */
                            var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
                            key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
                            var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
                            authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
                            endpoint = subscription.endpoint;

                            /* Sending the endpoint and keys to our route which saves it in memory */
                            return fetch("/subscription", {
                                method: "POST",
                                headers: {
                                    "Content-type": "application/json"
                                },
                                body: JSON.stringify({
                                    endpoint: subscription.endpoint,
                                    key: key,
                                    authSecret: authSecret,
                                    technician_id: technicianId
                                })
                            })
                            .then(function(res) {
                                if(res.ok) {
                                    return res.json();
                                } else {
                                    console.log('Network response was not ok.')
                                }
                            })
                            .then(function(json) {
                                console.log(json);
                            });
                    });
                });
        })
        .catch(function(err) {
            /* Log errors that occur */
            console.log("There was a problem with the Service Worker");
            console.log(err);
        });
}
