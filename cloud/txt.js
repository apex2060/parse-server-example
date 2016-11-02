var twilio = require('twilio');
var CONFIG = require('./cloud/config.js')


Parse.Cloud.define("sendSMS", function(request, response) {
	var user = Parse.User.current();
	if (!user)
		response.error('You must be logged in first.');
	if (!request.params.message)
		response.error('You must pass a message with your parameters.');
	if (!request.params.contactId)
		response.error('You must pass a contactId with your parameters.');

	//get contact
	var Contact = Parse.Object.extend("Contact");
	var query = new Parse.Query(Contact);
	query.get(request.params.contactId, {
		success: function(contact) {
			var packet = {
				From: CONFIG.KEY.TWILIO.PHONE,
				To: contact.get('phone'),
				Body: request.params.message
			}
			twilio.initialize(CONFIG.KEY.TWILIO.ACT, CONFIG.KEY.TWILIO.TOKEN);
			twilio.sendSMS(packet, {
				success: function(smsObj) {
					var Smms = Parse.Object.extend("Smms");
					var query = new Parse.Query(Smms);

					var hours2exp = 6;
					var expire = new Date();
					expire.setTime(expire.getTime() - hours2exp * 60 * 60 * 1000);
					query.equalTo('intNumber', smsObj.from)
					query.equalTo('extNumber', smsObj.to)
					query.greaterThan('updatedAt', expire);
					query.first({
						success: function(smms) {
							if (!smms) {
								var smms = new Smms();
								smms.set('intNumber', smsObj.from);
								smms.set('extNumber', smsObj.to);
								smms.set('agent', user);
								smms.set('contact', contact);
								smms.set('twilioResponse', smsObj);
							}
							var entry = {
								from: user.get('fullName'),
								account: user.id,
								messageSid: smsObj.sid,
								body: smsObj.body,
								time: new Date()
							}
							smms.set('direction', 'outbound')
							smms.add('messages', entry)
							smms.save().then(function(smms) {
								response.success(smms);
							})
						},
						error: function(error) {
							console.log('-----------------error-----------------------')
							console.log(error);
							response.success(error);
						}
					});
				},
				error: function(httpResponse) {
					response.error({
						httpResponse: httpResponse,
						packet: packet
					});
				}
			});
		},
		error: function(smms, error) {
			response.success(error);
		}
	});
});

exports.notify = function(number, message) {
	var promise = new Parse.Promise();
	var packet = {
		From: CONFIG.KEY.TWILIO.PHONE,
		To: number,
		Body: message
	}
	twilio.initialize(CONFIG.KEY.TWILIO.ACT, CONFIG.KEY.TWILIO.TOKEN);
	twilio.sendSMS(packet, {
		success: function(smsObj) {
			promise.resolve(smsObj);
		},
		error: function(error) {
			promise.reject(error);
		}
	});

	// Parse.Config.get().then(function(config) {
	//  var contactPhone = config.get("contactPhone");
	// });
	return promise;
}
exports.txtCenter = function(request, response) {
	if (CONFIG.TESTING || twilio.validateExpressRequest(request, CONFIG.KEY.TWILIO.TOKEN)) {
		var Smms = Parse.Object.extend("Smms");
		var query = new Parse.Query(Smms);

		//Start new conversation if current has not been modified in 6 hours
		var hours2exp = 6;
		var expire = new Date();
		expire.setTime(expire.getTime() - hours2exp * 60 * 60 * 1000);
		query.equalTo('extNumber', request.body.From)
		query.equalTo('intNumber', request.body.To)
		query.greaterThan('updatedAt', expire);
		query.first({
			success: function(smms) {
				if (!smms) {
					var smms = new Smms();
					smms.set('extNumber', request.body.From)
					smms.set('intNumber', request.body.To)
				}
				var entry = {
					from: request.body.From,
					messageSid: request.body.SmsSid,
					body: request.body.Body,
					time: new Date()
				}
				smms.set('direction', 'inbound')
				smms.add('messages', entry)
				smms.save().then(function() {
					response.send('Thanks!');
				})
			},
			error: function(error) {
				console.log('-----------------error-----------------------')
				console.log(error);
				response.send(error);
			}
		});
	}
	else {
		console.log('Not Valid Request')
	}
}