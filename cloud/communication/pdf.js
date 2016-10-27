var CONFIG = require('cloud/config.js');
var _ = require('underscore');

//----------------------------------------------------------------------------//
var auth = 'Bearer ' + CONFIG.KEY.PDF.secret
var rootURI = 'https://api.pdffiller.com/v1/';


var PDF = {	
	request: function(extention, params, method, response){
		method = method 	|| 'POST';
		response = response || 'data';
		var promise = new Parse.Promise();
		var request = {
			method: method,
			url: rootURI+extention,
			headers: {
				'Authorization': auth,
				'Content-Type': 'application/json'
			},
			body: params
		}
		console.log(request)
	
		Parse.Cloud.httpRequest(request).then(function(httpResponse){
			if(response == 'full')
				promise.resolve(httpResponse);
			else
				promise.resolve(httpResponse[response]);
		}, function(e){
			console.error(e)
			promise.reject(e);
		});
		return promise;
	},
	signature: function(document, recepients){
		//upload to pdffiller if not already
		//make signature requests
		//save signature requests in seperate table
		//post callback url to pdffiller - so updates can be recorded.
	},
	schema: function(document_id){
		var extention = 'fillable_template/'+document_id
		return PDF.request(extention, null, 'GET')
	},
	upload: function(url){
		var extention = 'document'
		return PDF.request(extention, {file:url}, 'POST', 'full')
	},
	fill: function(document_id, data){
		var extention = 'fillable_template';
		var request = {document_id:document_id,fillable_fields:data}
		return PDF.request(extention, request)
	},
	get: function(document_id){
		var extention = 'fillable_template/'+document_id+'/download'
		return PDF.request(extention, null, 'GET', 'full')
	},
}

exports.request	= PDF.request;
exports.schema	= PDF.schema;
exports.upload	= PDF.upload;
exports.fill	= PDF.fill;
exports.get 	= PDF.get;