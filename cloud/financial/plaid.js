var CONFIG = require('./cloud/config.js');
var _ = require('underscore')

var plaid = {
	request: function(action, params){
		var promise = new Parse.Promise();
		var getActions = ['/info','/institutions','/institutions/search','/categories']
		
		var req = {
			url: 	CONFIG.KEY.PLAID.url+action,
			body: 	_.extend(params, {
				client_id: CONFIG.KEY.PLAID.client_id,
				secret: CONFIG.KEY.PLAID.secret,
			})
		};
		getActions.indexOf(action) != -1 ? req.method = 'GET' : req.method = 'POST'
		
		Parse.Cloud.httpRequest(req).then(function(http) {
			promise.resolve(http.data)
		}, function(e) {
			promise.reject(e)
		})
		return promise;
	},
	auth: function(public_token, account_id) {
		var promise = new Parse.Promise();
		var params = {
			public_token: public_token
		}
		if(account_id)
			params.account_id = account_id
		
		plaid.request('/exchange_token', params).then(function(data){
			promise.resolve(data)
		}, function(e){
			promise.reject(e)
		})
		return promise;
	},
	upgrade: function(access_token, upgrade_to) {
		var promise = new Parse.Promise();
		var params = {
		  access_token: access_token,
		  upgrade_to: 	upgrade_to
		}
		
		plaid.request('/upgrade', params).then(function(data){
			promise.resolve(data)
		}, function(e){
			promise.reject(e)
		})
		return promise;
	},
	connect: function(access_token) {
		var promise = new Parse.Promise();
		var params = {
		  access_token: access_token,
		}
		
		plaid.request('/connect/get', params).then(function(data){
			promise.resolve(data)
		}, function(e){
			promise.reject(e)
		})
		return promise;
	}
}

//----------------------------------------------------------------------------//

exports.auth 	= plaid.auth;
exports.upgrade	= plaid.upgrade;

//----------------------------------------------------------------------------//

Parse.Cloud.define('plaidConnect', function(request, response){
	plaid.auth(request.params.public_token, request.params.account_id).then(function(data){
		plaid.connect(data.access_token).then(function(data){
			response.success(data);
		}, function(e){
			response.error(e)
		})
	}, function(e){
		response.error(e)
	})
});