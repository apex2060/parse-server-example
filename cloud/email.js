var mailgun = require('mailgun');
var CONFIG = require('./cloud/config.js')


exports.send = function(packet) {
	var promise = new Parse.Promise();
	mailgun.initialize(CONFIG.KEY.MAILGUN_URL, CONFIG.KEY.MAILGUN_KEY);
	mailgun.sendEmail(packet, {
		success: function(httpResponse) {
			promise.resolve(httpResponse);
		},
		error: function(error) {
			promise.reject(error);
		}
	});
	return promise;
}