var CONFIG = require('cloud/config.js');
var _ = require('underscore');
var Buffer = require('buffer').Buffer;
//----------------------------------------------------------------------------//
var auth = 'Basic ' +new Buffer(CONFIG.KEY.LOB.auth_token + ':').toString('base64');
var rootURI = 'https://api.lob.com/v1/';


var snail = {	
	request: function(extention, params, method){
		method = method || 'POST';
		var promise = new Parse.Promise();
		Parse.Cloud.httpRequest({
			method: method,
			url: rootURI+extention,
			headers: {
				'Authorization': auth,
				'Content-Type': 'application/json'
			},
			body: params
		}).then(function(httpResponse){
			promise.resolve(httpResponse.data);
		}, function(e){
			promise.reject(e);
		});
		return promise;
	},
	address: {
		create: function(params){
			return snail.request('addresses', params)
		},
		list: function(){
			return snail.request('addresses', {}, 'GET')
		}
	},
	postcard: {
		create: function(params){
			//lob.com/docs/node#postcards_create
			return snail.request('postcards', params)
		}
	},
	route: {
		list: function(zip){
			return snail.request('routes/'+zip, {}, 'GET')
		}
	}
}
exports.addressCreate = snail.address.create;
exports.addressList = snail.address.list;
exports.postcardCreate = snail.postcard.create;


Parse.Cloud.define('snailPostcard', function(request, response) {
	snail.postcard.create(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});
Parse.Cloud.define('snailRoutes', function(request, response) {
	snail.route.list(request.params.zip).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});