var CONFIG = require('cloud/config.js');
var _ = require('underscore');
//----------------------------------------------------------------------------//
/*
	
*/
//----------------------------------------------------------------------------//

var rootURI = 'https://api.cloudinary.com/v1_1/';
var defaults = {
	api_key: CONFIG.KEY.PHAXIO.api_key,
	api_secret: CONFIG.KEY.PHAXIO.api_secret,
}

var IMAGE = {	
	request: function(extention, params, method){
		method = method || 'POST';
		params = _.extend(defaults, params);
		var promise = new Parse.Promise();
		Parse.Cloud.httpRequest({
			method: method,
			url: rootURI+extention,
			body: params
		}).then(function(httpResponse){
			promise.resolve(httpResponse.data);
		}, function(e){
			promise.reject(e);
		});
		return promise;
	},
	areaCodes: function(state){
		return IMAGE.request('areaCodes', {});
	},
	provision: function(areaCode){
		areaCode = areaCode || CONFIG.DEFAULTS.areaCode
		return IMAGE.request('provisionNumber', {
			area_code: areaCode
		});
	},
	release: function(number){
		return IMAGE.request('releaseNumber', {
			number: number
		});
	},
	send: function(params){
		//www.phaxio.com/docs/api/v1/send/sendIMAGE
		return IMAGE.request('send', params);
	},
	list: function(params){
		return IMAGE.request('faxList', params);
	}
}