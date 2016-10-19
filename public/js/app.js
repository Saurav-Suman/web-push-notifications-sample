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

            // Add techId to local storage
            persistData('key', technicianId);

            /* Get subscription */
            return registration.pushManager.getSubscription()
                .then(function(subscription) {

                    /* If a subscription was found, return it */
                    if(subscription) {

                        console.log('User already subscribed.');

                        /* If user already subscribed on client side we must ensure the subscription is in database */
                        return sendSubscriptionInfo(subscription, technicianId)
                            .then(function(res) {
                                if(res.ok) {
                                    /* Update worker periodically */
                                    setUpdateInterval(registration);
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

                            /* Save subscription to db */
                            return sendSubscriptionInfo(subscription, technicianId)
                                .then(function(res) {
                                    if(res.ok) {
                                        /* Update worker periodically */
                                        setUpdateInterval(registration);
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

    /* This fires when the service worker controlling this page
    changes. ex: a new worker has skipped waiting and became the new active worker (don't need method?) */
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('A new service worker has taken control and is active.')
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

    /* Sending the endpoint and keys to our server route which checks existence and saves it to database */
    return fetch("/subscription", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body: JSON.stringify(subscriptionInfo)
    });
}

/* Browser checks for updates automatically after navigations and functional events but you can also
trigger them manually. If you expect the user to be using your site for a long time without reloading,
you may want to call registration.update() on an interval (setInterval) */
function setUpdateInterval(registration) {
    setInterval(function(){ registration.update(); }, 3000);
}

/* Sends a message to the service worker (triggers their 'message' listener) */
function sendMessage(json) {
    registration.active.postMessage(JSON.stringify({technician_id: technicianId}));
}

/* Persist data into local storage */
function persistData(stringKey, value) {
    localforage.setItem(stringKey, value).then(function () {
        return localforage.getItem(stringKey);
    })
    .then(function(value) {
        console.log('Value is set to local storage: ', value);
    })
    .catch(function(err) {
        console.log(err);
    });
}