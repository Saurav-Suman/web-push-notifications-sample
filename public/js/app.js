//============================================================================================
// SETUP OUR SERVICE WORKER
//============================================================================================
var endpoint;
var key;
var authSecret;

/* Checks for existence of service worker in the navigator object */
if("serviceWorker" in navigator) {

    /* Registration returns a service worker promise object */
    navigator.serviceWorker.register("/js/service-worker.js")
        .then(function(registration) {

            /* Get subscription */
            return registration.pushManager.getSubscription()
                .then(function(subscription) {

                    /* If a subscription was found, return it */
                    if(subscription) {

                        console.log('User already subscribed.');
                        /* Send message to service worker to set the technician id */
                        registration.active.postMessage(JSON.stringify({technician_id: technicianId}));

                        /* If user already subscribed on client side we must ensure the subscription is in database */
                        return sendSubscriptionInfo(subscription, technicianId)
                            .then(function(res) {
                                if(res.ok) {
                                    return res.json();
                                } else {
                                    console.log('Network response was not ok.')
                                }
                            })
                            .then(function(json) {
                                console.log(json);
                                return subscription;
                            });
                    }
                    /* Otherwise pass in argument required to subscribe and show visible notification to end user */
                    return registration.pushManager.subscribe({userVisibleOnly: true})
                        .then(function(subscription) {

                            console.log('Subscribing the user.');
                            /* Send message to service worker to set the technician id */
                            registration.active.postMessage(JSON.stringify({technician_id: technicianId}));

                            /* Save subscription to db */
                            return sendSubscriptionInfo(subscription, technicianId)
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

/* Retrieve encryption data required for payload transfer on chrome (must be chrome v.50+) */
function sendSubscriptionInfo(subscription, techId) {

    /* Format data */
    var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
    key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
    var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
    authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
    endpoint = subscription.endpoint;

    var subscriptionInfo = {
        endpoint: subscription.endpoint,
        key: key,
        authSecret: authSecret,
        technician_id: techId
    };

    console.log(subscriptionInfo)

    /* Sending the endpoint and keys to our server route which checks existence and saves it to database */
    return fetch("/subscription", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(subscriptionInfo)
    });
}