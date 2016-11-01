
var Stripe = require('stripe-fire');

var stripeFire = require("cloud/stripe-fire")("sk_test_9I9XHDH7nBVcB3ola0vfOYCJ");
var charges = stripeFire.charges("https://ldstreasury-6424b.firebaseio.com/stripe/charges", function(err, charge) {
    // Called after a create/update charge request is sent to Stripe 
}, "ACCESS_TOKEN", function(chargeData) {
    // Called before a create/update charge request is sent to Stripe 
    return chargeData;
});