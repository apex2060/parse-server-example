var CONFIG = require('cloud/config.js');
var CONTACT = require('cloud/communication/contact.js');
var TIMELINE = require('cloud/communication/timeline.js');
var DOC = require('cloud/communication/document.js');
var _ = require('underscore');
//----------------------------------------------------------------------------//
/*
	To send a fax, save an object in Faxes with a from, to, and attachment
	{
		from: 	'1234567890',
		to: 	'9876543210',
		attachment: {
			secure_url: 'https://...'
		}
	}
*/
//----------------------------------------------------------------------------//

var TEST = false;
var rootURI = 'https://api.phaxio.com/v1/';
var defaults = {
	api_key: CONFIG.KEY.PHAXIO.api_key,
	api_secret: CONFIG.KEY.PHAXIO.api_secret,
}

var FAX = {	
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
		return FAX.request('areaCodes', {});
	},
	provision: function(areaCode){
		areaCode = areaCode || CONFIG.DEFAULTS.areaCode
		return FAX.request('provisionNumber', {
			area_code: areaCode,
			callback_url: CONFIG.KEY.URL+'/syncFaxes'
		});
	},
	release: function(number){
		return FAX.request('releaseNumber', {
			number: number
		});
	},
	send: function(params){
		//www.phaxio.com/docs/api/v1/send/sendFax
		return FAX.request('send', params);
	},
	list: function(params){
		return FAX.request('faxList', params);
	}
}

exports.areaCodes = FAX.areaCodes;
exports.provision = FAX.provision;
exports.release = FAX.release;
exports.send = FAX.send;

Parse.Cloud.define('faxAreaCodes', function(request, response) {
	FAX.areaCodes(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});
Parse.Cloud.define('faxProvision', function(request, response) {
	var FaxNumbers = Parse.Object.extend("FaxNumbers");
	var faxNumber = new FaxNumbers();
	faxNumber.set('areaCode', request.params.area_code)
	faxNumber.save(null, {
		success: function(faxNumber){
			FAX.provision(request.params.area_code).then(function(result){
					faxNumber.set('title', 	'undefined');
					faxNumber.set('number', result.data.number);
					faxNumber.set('city', 	result.data.city);
					faxNumber.set('state', 	result.data.state);
					faxNumber.save(null, {
						success: function(faxNumber) {
							response.success(result)
						}, error: function(e) {
							response.error(e)
						}
					})
			}, function(e){
				response.error(e)
			})
		}, error: function(e){
			response.error('You do not have permission to provision a fax number.')
		}
	})
});
Parse.Cloud.define('faxRelease', function(request, response) {
	FAX.release(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});
// Parse.Cloud.beforeSave('Faxes', function(request, response){
// 	response.success();
// })
Parse.Cloud.afterSave("Faxes", function(request, response) {
	var user = Parse.User.current();
	var fax = request.object;
	
	function getFrom(){
		var promise = new Parse.Promise();
		var FaxNumbers = Parse.Object.extend("FaxNumbers");
		var query = new Parse.Query(FaxNumbers);
		query.equalTo("number", request.object.get('localNumber'));
		query.first({
			success: function(faxNumber) {
				promise.resolve(faxNumber);
			},
			error: function(e) {
				console.error(e)
			}
		});
		return promise;
	}
	function getTo(){
		return CONTACT.tools.looksert('fax', request.object.get('remoteNumber'));
	}
	function sendFax(local, remote){
		var promise = new Parse.Promise();
		fax.set('direction', 'sent');
		fax.set('user', user);
		fax.set('local', local);
		fax.set('remote', remote);
		fax.set('archived', false);
		fax.set('ACL', local.get('ACL'));

		var req = {
			to: 				fax.get('remoteNumber'),
			caller_id: 			fax.get('localNumber'),
			header_text: 		fax.get('subject'),
			string_data: 		fax.get('attachment').secure_url,
			string_data_type: 	'url'
		}
		if(TEST)
			fax.save().then(function(fax){
				promise.resolve(fax);
			})
		else
			FAX.send(req).then(function(result){
				fax.set('faxId', result.faxId)
				fax.set('status', result.message)
				fax.save().then(function(fax){
					promise.resolve(fax);
				})
			},function(e){
				console.error(e)
			})
		return promise;
	}
	
	if(!fax.existed()){
		if(fax.get('direction') != 'received'){
			getFrom().then(function(local){
				getTo().then(function(remote){
					sendFax(local, remote).then(function(fax){
						TIMELINE.tools.upsert('Faxes', fax, user)
					})
				})
			})
		}else{
			TIMELINE.tools.upsert('Faxes', fax, user)
		}
	}
});

Parse.Cloud.job("syncFaxes", function(request, status) {
	Parse.Cloud.useMasterKey();
	var tools = {
		notComplete: function(faxes) {
			var promise = new Parse.Promise();
			var ids = faxes.map(function(f){return f.id})

			var Faxes = Parse.Object.extend("Faxes");
			var query = new Parse.Query(Faxes);
			query.containedIn("faxId", ids);
			query.containedIn("status", ['success', 'failure']);
			//all faxes that are complete
			query.find({
				success: function(cFaxes) {
					var cids = cFaxes.map(function(f){return f.get('faxId')})
					var notComplete = faxes.filter(function(fax){
						return (cids.indexOf(fax.id) == -1)
					})
					var nids = notComplete.map(function(f){return f.id})
					promise.resolve(notComplete);
				}
			});
			return promise;
		},
		
		syncFax: function(faxEntry) {
			var promise = new Parse.Promise();
			Parse.Cloud.useMasterKey();
			
			//Get related fax number (so we can make associations and save information correctly.)
			var FaxNumbers = Parse.Object.extend("FaxNumbers");
			var faxNumberPromise = new Parse.Promise();
			var query = new Parse.Query(FaxNumbers);
			query.equalTo("number", faxEntry.to_number.substring(2));
			query.first({
				success: function(faxNumber) {
					console.log('found number')
					faxNumberPromise.resolve(faxNumber)
				}, error: function(e){
					console.log(222)
					console.log(e)
				}
			})
			
			//Get fax document (so we can save it for later retrival.)
			var faxDocPromise = new Parse.Promise();
			Parse.Cloud.httpRequest({
				method: 'POST',
				url: 'https://api.phaxio.com/v1/faxFile',
				body: {
					id: faxEntry.id,
					type: 'p',
					api_key: CONFIG.KEY.PHAXIO.api_key,
					api_secret: CONFIG.KEY.PHAXIO.api_secret,
				}
			}).then(function(faxDoc){
				faxDocPromise.resolve(faxDoc)
			}, function(e){
				console.error('237');
				console.log(faxEntry)
				console.error(e);
				faxDocPromise.reject(e)
			})
			
			Parse.Promise.when([faxNumberPromise, faxDocPromise]).then(function(){
				console.log('found number and doc')
				var faxNumber	= arguments[0]
				var faxDoc		= arguments[1]
				var title		= 'Fax from: '+faxEntry.from_number;
				var file = encodeURI('data:application/pdf;base64,')+faxDoc.buffer.toString("base64");
				var folder = faxNumber.get('folder');
				
				DOC.uploadFax(title, file, folder).then(function(doc){
					tools.saveFax(faxEntry, faxNumber, doc).then(function(fax){
						promise.resolve(fax);
					}, function(e){
						console.error('251');
						console.error(e);
						promise.reject(e)
					})
				}, function(e){
					console.error('256');
					console.error(e);
					promise.reject(e)
				})
			}, function(e){
				console.error('261');
				console.error(e);
			})
			return promise;
		},
		saveFax: function(faxEntry, faxNumber, doc){
			var promise = new Parse.Promise();
			var Faxes = Parse.Object.extend("Faxes");
			var query = new Parse.Query(Faxes);
			query.equalTo("faxId", faxEntry.id);
			query.first({
				success: function(fax) {
					if (!fax)
						fax = new Faxes();

					fax.set("archived", false);
					if(doc){
						fax.set("doc", doc);
						fax.set("attachment", doc.get('cloudinary'));
					}
					
					fax.set("completedAt", faxEntry.completed_at);
					fax.set("details", faxEntry);
					fax.set("direction", faxEntry.direction);
					fax.set("faxId", faxEntry.id);
					fax.set("local", faxNumber);
					fax.set("pages", faxEntry.num_pages);
					fax.set("requestedAt", faxEntry.requested_at);
					fax.set("status", faxEntry.status);
					
					if (faxEntry.direction == 'sent') {
						fax.set("localNumber", faxEntry.from_number);
						fax.set("recepients", faxEntry.recipients);
					} else {
						fax.set("remoteNumber", faxEntry.from_number.substring(2));
						fax.set("localNumber", faxEntry.to_number.substring(2));
					}
					fax.save().then(function(){
						promise.resolve(fax);
					})
				},
				error: function(error) {
					promise.reject(error);
				}
			});
			return promise;
		}
	}

	FAX.list({}).then(function(faxList){
		tools.notComplete(faxList.data).then(function(faxes) {
			
			function syncEach(list){
				var promise = new Parse.Promise();
				if(list.length > 0){
					var entry = list.pop();
					console.log(entry)
					if(entry.direction=='received' && entry.status == 'success'){
						console.log('received')
						tools.syncFax(entry).then(function(r){
							console.log('synced')
							syncEach(list).then(function(){
								console.log('others complete')
								promise.resolve();
							})
						})
					}else{
						console.log('rejected')
						syncEach(list).then(function(){
							promise.resolve();
						})
					}
				}else{
					promise.resolve();
				}
				return promise;
			}
			console.log(faxes);
			return syncEach(faxes)
			
			// var promises = [];
			// faxes.forEach(function(fax){
			// 	if(fax.status == 'success')
			// 		promises.push(tools.syncFax(fax))
			// })
			// return Parse.Promise.when(promises);
		}).then(function(faxes) {
			status.success('Thanks for the Report!');
		}, function(e) {
			console.log('ERROR ON LINIE 318')
			console.error(e);
			status.error('An error occurred.');
		})
	}, function(e){
		status.error('FaxList Request failed with response code ' + e);
	})
	// Parse.Cloud.httpRequest({
	// 	method: 'POST',
	// 	url: 'https://api.phaxio.com/v1/faxList',
	// 	body: {
	// 		api_key: CONFIG.KEY.PHAXIO.api_key,
	// 		api_secret: CONFIG.KEY.PHAXIO.api_secret
	// 	}
	// }).then(function(httpResponse) {
	// 	var allFaxes = JSON.parse(httpResponse.text).data;

	// 	tools.notComplete(allFaxes).then(function(faxes) {
	// 		var promises = [];
	// 		for (var i = 0; i < faxes.length; i++) {
	// 			promises.push(tools.getFax(faxes[i]))
	// 		}
	// 		return Parse.Promise.when(promises);
	// 	}).then(function(faxes) {
	// 		status.success('Thanks for the Report!');
	// 	}, function(e) {
	// 		status.error(e);
	// 	})
	// }, function(httpResponse) {
	// 	status.error('FaxList Request failed with response code ' + httpResponse.status);
	// });
});
