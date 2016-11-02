var CONFIG = require('./cloud/config.js');
var CONTACT = require('./cloud/communication/contact.js');
var TIMELINE = require('./cloud/communication/timeline.js');
var DOC = require('./cloud/communication/document.js');
var _ = require('underscore');

Parse.Cloud.job("fbCoverse", function(request, status) {
	Parse.Cloud.useMasterKey();
	var tools = {
		getMessage: function(entryId){
			var promise = new Parse.Promise();
			var Facebook = Parse.Object.extend("Facebook");
			
			var query = new Parse.Query(Facebook);
			query.equalTo("objectId", entryId);
			query.first({
				success: function(entry) {
					promise.resolve(entry);
				}
			})
			return promise;
		},
		respond: function(entryId){
			tools.getMessage(entryId).then(function(entry){
				var recipientId = entry.get('senderId')
				var url = 'https://graph.facebook.com/v2.6/me/messages?access_token='+CONFIG.KEY.FACEBOOK.page_token;
				
				var request = {
				 	method: 'POST',
				 	url: url,
				 	headers: {
				 		'Content-Type': 'application/json'
				 	},
				 	body:{
				 	 	"recipient": {
				 	 		"id": recipientId
				 	 	},
				 	 	"message": {
				 	 		"text": "Hi There!"
				 	 	}
				 	 }
				 }
				
				 Parse.Cloud.httpRequest(request).then(function(httpResponse) {
				 	if (httpResponse.data)
						console.log(httpResponse.data)
				 	else
						console.log(httpResponse)
				 }, function(e) {
				 	console.log(e)
				 });
			})
		}
	}
	console.log('converse')
	console.log(request.params.entryId)
	tools.respond(request.params.entryId);
});
