var CONFIG 	= require('cloud/config.js')

var tools = {
	lookup: function(key, value){
		var promise = new Parse.Promise();
		var Contacts = Parse.Object.extend("Contacts");
		var query = new Parse.Query(Contacts);
		query.equalTo(key, value);
		query.first({
			success: function(contact) {
				if(contact)
					promise.resolve(contact);
				else
					promise.reject('Not found')
			},
			error: function(e) {
				console.error(e)
				promise.reject(e)
			}
		});
		return promise;
	},
	looksert: function(key, value){
		var promise = new Parse.Promise();
		tools.lookup(key, value).then(function(contact){
			promise.resolve(contact)
		}, function(e){
			var obj = {};
			obj[key] = value;
			tools.create(obj).then(function(contact){
				promise.resolve(contact)
			}, function(e){
				promise.reject(e)
			})
		})
		return promise;
	},
	create: function(contactInfo){
		var promise = new Parse.Promise();
		var Contacts = Parse.Object.extend("Contacts");
		var contact = new Contacts;
		contact.save(contactInfo, {
			success: function(contact){
				promise.resolve(contact);
			}, error: function(e){
				promise.reject(e);
			}
		})
		return promise;
	}
}

exports.tools = tools;