var CONFIG 		= require('./cloud/config.js');
var COMMON 		= require('./cloud/common.js');
var GOOGLE 		= require('./cloud/google.js');
var TIMELINE 	= require('./cloud/communication/timeline.js');
var _ 			= require('underscore');
var Buffer = require('buffer').Buffer;

//----------------------------------------------------------------------------//

var auth = 'Basic ' +new Buffer(CONFIG.KEY.PLIVO.auth_id + ':' + CONFIG.KEY.PLIVO.auth_token).toString('base64');
var defaults = {
	country_iso: 'US',
	services: 'voice,sms'
}

var tools = {
	request: function(extension, params, method){
		method = method || 'POST';
		var promise = new Parse.Promise();
		var request = {
			method: method,
			url: 'https://api.plivo.com/v1/'+extension,
			headers: {
				'Authorization': auth,
				'User-Agent': 'ParsePlivo',
				'Content-Type': 'application/json'
			},
		}
		if(params)
			request.body = params;

		Parse.Cloud.httpRequest(request).then(function(httpResponse){
			if(httpResponse.data)
				promise.resolve(httpResponse.data);
			else
				promise.reject(httpResponse);
		}, function(e){
			promise.reject(e);
		});
		return promise;
	},
	number: {
		list: function(params){
			var extension = 'Account/'+CONFIG.KEY.PLIVO.auth_id+'/PhoneNumber/';
				if(!params.country_iso)
					params.country_iso = 'US'
				extension += '?country_iso='+params.country_iso;
				if(params.pattern)
					extension += '&pattern='+params.pattern
			return tools.request(extension, params, 'GET')
		},
		create: function(number){
			var extension = 'Account/'+CONFIG.KEY.PLIVO.auth_id+'/PhoneNumber/'+number+'/';
			return tools.request(extension)
		},
		delete:function(number){
			var promise = new Parse.Promise();
			var extension = 'Account/'+CONFIG.KEY.PLIVO.auth_id+'/Number/'+number.get('number')+'/'
			tools.request(extension, null, 'DELETE').then(function(r){
				promise.reject(r)
			}, function(e){
				if(e.status == 204){
					promise.resolve('removed')
				}else{
					promise.reject(e)
				}
			})
			return promise;
		}
	},
	endpoint: {
		create: function(endpoint){
			var params = {
				username: endpoint.get('username'), 
				password: endpoint.get('password'), 
				alias: endpoint.get('alias')
			}
			return tools.request('Account/'+CONFIG.KEY.PLIVO.auth_id+'/Endpoint/', params)
		},
		update: function(endpoint){
			var extension = 'Account/'+CONFIG.KEY.PLIVO.auth_id+'/Endpoint/'+endpoint.get('endpoint_id')+'/'
			var params = {
				password: 	endpoint.get('password'), 
				alias: 		endpoint.get('alias')
			}
			
			return tools.request(extension, params)
		},
		delete: function(endpoint){
			var promise = new Parse.Promise();
			var extension = 'Account/'+CONFIG.KEY.PLIVO.auth_id+'/Endpoint/'+endpoint.get('endpoint_id')+'/'
			tools.request(extension, null, 'DELETE').then(function(r){
				promise.reject(r)
			}, function(e){
				if(e.status == 204){
					promise.resolve('removed')
				}else{
					promise.reject(e)
				}
			})
			return promise;
		},
		get: function(sip){
			var promise = new Parse.Promise();
				sip = sip.split(':')
				sip = sip[1].split('@')[0];

			var PhoneEndpoints = Parse.Object.extend("PhoneEndpoints");
			var query = new Parse.Query(PhoneEndpoints);
			query.equalTo("username", sip);
			query.first({
				success: function(endpoint) {
					promise.resolve(endpoint);
				}
			})
			return promise;
		}
	},
	message: {
		send: function(from, to, message){
			var params = {
				src: from, 
				dst: tools.format(to,from), 
				text: message
			}
			return tools.request('Account/'+CONFIG.KEY.PLIVO.auth_id+'/Message/', params)
		},
	},
	format: function(num, rel){
		num = num.toString();
		if(!!rel)
			num = rel.substr(0, rel.length-num.length)+num
		else if(num.length == 10)
			num = '1'+num
		return num;
	}
}

var act = {
	say: function(request, call, action){
		var promise = new Parse.Promise();
		var xml = '';
		if(action.how == 'text'){
			xml = render.speak(action.text)
			promise.resolve(xml);
		}else if(action.how == 'mp3'){
			xml = render.play(action.url)
			promise.resolve(xml);
		}else if(action.how == 'qry'){
			var Table = Parse.Object.extend(action.qry.table);
			var query = new Parse.Query(Table);
			var qryTxt = COMMON.interpolate(action.qry.what, {call:request})
			query.equalTo(action.qry.col, qryTxt);
			query.first({
				success: function(data) {
					if(data)
						var message = COMMON.interpolate(action.qry.template, {call:request, data:data.toJSON()})
					else
						var message = action.text
					var xml = render.speak(message)
					promise.resolve(xml);
				}
			})
		}
		return promise;
	},
	forward: function(request, call, action){
		var promise = new Parse.Promise();
		var xml = '';
		
		if(action.how == 'number'){
			//GET USER TO ASSOCIATE...
			// TIMELINE.tools.add('PhoneCalls', call).then(function(r){
				if(action.sequential){
					action.numbers.forEach(function(number){
						if(String(number).length == 11)
							xml += render.dial('<Number>'+number+'</Number>', {
								callbackUrl: 	CONFIG.KEY.URL+'/switchBoard',
								callerId: 		String(request.From),
								timeout: 		'10'
							})
						else
							xml += render.dial('<User>'+number+'</User>', {
								callbackUrl: 	CONFIG.KEY.URL+'/switchBoard',
								callerId: 		String(request.From),
								timeout: 		'10'
							})
					})
				}else{
					var ele = ''
					action.numbers.forEach(function(number){
						if(String(number).length == 11)
							ele += '<Number>'+number+'</Number>'
						else
							ele += '<User>'+number+'</User>'
					})
					xml += render.dial(ele, {
						callbackUrl: 	CONFIG.KEY.URL+'/switchBoard',
						callerId: 		String(request.From)
					})
				}
			// }, function(e){
			// 	console.error(e)
			// })
		}else if(action.how == 'lookup'){
			
		}else{
			xml = render.speak('There was an error.  189')
		}
		if(action.record && action.record.active){
			xml = render.record({
				action: 			CONFIG.KEY.URL+'/switchBoard',
				maxLength: 			Number(action.record.maxLength),
				playBeep: 			action.record.playBeep,
				startOnDialAnswer: 	true,
				redirect: 			false
			}) + xml
		}
		call.set('process', {type:'forward', record:action.record})
		call.save().then(function(){
			promise.resolve(xml);
		})
		
		return promise;
	},
	menu: function(request, call, action){
		var promise = new Parse.Promise();
		var xml = '';
		
		if(action.say)
			xml = render.speak(action.say);
		
		if(action.read){
			var say = ''
			action.items.forEach(function(item){
				say += 'For '+item.alias+' press '+item.extention+'. '
			})
			xml += render.speak(say)
		}
		xml = render.getDigits(xml, {
			action: CONFIG.KEY.URL+'/switchBoard'
		})
		
		call.set('process', {type:'menu', options:action.items, record:action.record})
		call.save().then(function(){
			promise.resolve(xml);
		})
		return promise;
	}
}

var call = {
	out: function(request, call){
		var promise = new Parse.Promise();
		
		//dialing out is different than dialing in.
			//outbound dial may want to (check voicemail, change voicemail, setup follow me... get a report)
			//They may have access to extra functions
		//dialing out should provide a similar experience
			//it is recomended that the extention menu be the same
		
		tools.endpoint.get(request.From).then(function(endpoint){
			var from = endpoint.get('number')
			var to = tools.format(request.To, from)
			var r = {
				From: from
			}
			var action = {
				how: 'number',
				numbers: [to],
				record: {
					active: true,
					maxLength: 36000,
					startOnDialAnswer: true,
					redirect: false
				}
			}
			act.forward(r, call, action).then(function(xml){
				xml = render.response(xml)
				promise.resolve(xml)
			})
		})
		return promise;
	},
	// out: function(request, call){
	// 	var promise = new Parse.Promise();
		
	// 	if(request.Direction == 'outbound')
	// 		call.set("direction", 'serversent')
	// 	else
	// 		if(request.From.indexOf('sip:') == -1) //May need to go by something else when calling inner-office??
	// 			call.set("direction", 'inbound')
	// 		else
	// 			call.set("direction", 'outbound')

	// 	/*
	// 		Check if an extension exists for the number dialed.
	// 		True: 	forward call to number || perform action defined by extension
	// 		False: 	obtain dialing from number and format to number
	// 	*/
	// 	tools.endpoint.get(request.From).then(function(endpoint){
	// 		function resolveCall(xml){
	// 			promise.resolve(
	// 				render.response(
	// 					render.dial(xml, {
	// 						callerId: 		String(endpoint.get('number')),
	// 						callbackUrl: 	CONFIG.KEY.URL+'/switchBoard'
	// 					})
	// 				)
	// 			)
	// 		}
	// 		var PhoneExtensions = Parse.Object.extend("PhoneExtensions");
	// 		var query = new Parse.Query(PhoneExtensions);
	// 		query.equalTo("extension", parseInt(request.To));
	// 		query.first({
	// 			success: function(extension) {
	// 				if(extension){
	// 					//TODO STILL NEED to worry about end-user options & SIP extensions
	// 					var to = tools.format(extension.get('number'))
	// 					call.set('toTwo', {type: 'extension', extension: extension.toJSON()})
	// 					call.save();
	// 					resolveCall('<Number>'+to+'</Number>')
	// 				}else{
	// 					var to = tools.format(request.To)
	// 					call.set('toTwo', {type: 'number', number: to})
	// 					call.save();
	// 					resolveCall('<Number>'+to+'</Number>')
	// 				}
	// 			}, error: function(e){
	// 				call.save();
	// 				promise.resolve(render.response(render.speak(e.message)))
	// 			}
	// 		});
	// 	});
	// 	return promise;
	// },
	in: function(request, call){
		var promise = new Parse.Promise();
		
		var PhoneNumbers = Parse.Object.extend("PhoneNumbers");
		var query = new Parse.Query(PhoneNumbers);
		query.equalTo("number", request.To);
		query.first({
			success: function(number) {
				if(number){
					try{
						var defaultIndex = number.get('defaultRule');
						var flows = number.get('flows')
						//follow rules
						var flow = flows[defaultIndex]
						var promises = 	[]
						flow.actions.forEach(function(action){
							promises.push(act[action.type](request, call, action))
						})
						Parse.Promise.when(promises).then(function(){
							var output = ''
							for(var i=0; i<arguments.length; i++){
								output += arguments[i]
							}
							promise.resolve(render.response(output))
						}, function(e){
							promise.resolve(e)
						})
					}catch(e){
						promise.resolve(render.response(render.speak('Hmmm Ha!  There was an error.  Try email. 0001')))
					}
				}else{
					promise.resolve(render.response(render.speak('Hmmm Ha!  There was an error.  Try email. 0002')))
				}
			}, error: function(e){
				promise.resolve(render.response(render.speak(e.message)))
			}
		});
		return promise;
	},
	redirect: function(request, call){
		var promise = new Parse.Promise();
		var process = call.get('process')
		if(process.type == 'menu'){
			var option = {}
			process.options.forEach(function(o){
				if(o.extention == request.Digits)
					option = o
			})
			var action = {how: 'number', numbers: [option.forward], record: process.record}
			act.forward(request, call, action).then(function(xml){
				xml = render.response(xml)
				promise.resolve(xml)
			})
		}else{
			promise.resolve(render.response(render.speak('A read direct redirect!')))
		}
		return promise;
	},
	connect: function(request, call){
		var promise = new Parse.Promise();
		call.set('to', request.DialBLegTo)
		call.set('status', request.DialBLegStatus)
		call.save(null, {
			success: function(call){
				promise.resolve(call)
				// TIMELINE.tools.upsert('PhoneCalls', call).then(function(r){
				// 	promise.resolve(r)
				// }, function(e){
				// 	promise.reject(e)
				// })
			}, error: function(e){
				promise.reject(e)
			}
		})
		return promise;
	},
	record: function(request, call){
		var promise = new Parse.Promise();
		var PhoneRecordings = Parse.Object.extend("PhoneRecordings");
		var recording = new PhoneRecordings();
		recording.set('callId', request.CallUUID)
		recording.set('recordingId', request.RecordingId)
		recording.set('url', request.RecordUrl)
		var process = call.get('process')
			if(process && process.record && process.record.ACL)
		recording.set('ACL', process.record.ACL)
		recording.set('call', call)
		recording.save(null, function(recording){
			call.set('recording', recording)
			console.log(call)
			call.save(null, function(){
				promise.resolve('Thanks')
			}, function(r,e){
				promise.reject(e)
			})
		}, function(r,e){
			promise.reject(e)
		})
		return promise;
	},
	log: function(request){
		var promise = new Parse.Promise();
		
		function fbUpdate(call){
			if(call.updatedAt)
				GOOGLE.tools.firebase.set('/class/PhoneCalls/updatedAt/', {time:call.updatedAt}).then(function(r){
					TIMELINE.tools.upsert('PhoneCalls', call).then(function(r){
						promise.resolve(call)
					}, function(e){
						promise.reject(e)
					})
					// promise.resolve(result)
				})
			else
				promise.resolve(call)
		}
		
		var PhoneCalls = Parse.Object.extend("PhoneCalls");
		var query = new Parse.Query(PhoneCalls);
		query.equalTo("callId", request.CallUUID);
		query.first({
			success: function(call){
				if(call){
					var history = call.get('history')
					if(request.Event != 'Record')
						history.push(request)
					call.set('status', 		request.CallStatus)
					call.set('duration', 	request.Duration)
					call.set('event', 		request.Event)
					call.set('history', 	history)
					call.save(null, {
						success:function(r){
							fbUpdate(r)
						},
						error: function(r, e){
							fbUpdate(r)
						}
					})
				}else{
					call = new PhoneCalls();
					call.set('history', 	[request])
					call.set('from', 		request.From)
					call.set('to', 			request.To)
					call.set('duration', 	request.Duration)
					call.set('status', 		request.CallStatus)
					call.set('callId', 		request.CallUUID)
					call.set('event', 		request.Event)
					if(request.From.indexOf('sip:') > -1)
						call.set('direction', 'outbound')
					else
						call.set('direction', 'inbound')
					
					call.save(null, {
						success:function(r){
							fbUpdate(r)
						},
						error: function(r, e){
							fbUpdate(r)
						}
					})
				}
			},
			error: function(e){
				fbUpdate(e)
			}
		})
		return promise;
	}
}
var render = {
	attr: function(obj){
		var str = "";
		var keys = Object.keys(obj);
		keys.forEach(function(key){
			str += key+'="'+obj[key]+'" '
		})
		return str;
	},
	response: function(content){
		return '<Response>'+content+'</Response>'
	},
	speak: function(message){
		return '<Speak>'+message+'</Speak>'
	},
	play: function(url){
		return '<Play>'+url+'</Play>'
	},
	dial: function(inside, params){
		return '<Dial '+render.attr(params)+'>'+inside+'</Dial>'
	},
	record: function(params){
		return '<Record '+render.attr(params)+' />'
	},
	getDigits: function(inside, params){
		return '<GetDigits '+render.attr(params)+' method="POST">'+inside+'</GetDigits>'
	}
}


var sms = {
	in: function(request){
		var promise = new Parse.Promise();
		var SMS = Parse.Object.extend("SMS");
		var sms = new SMS();

		sms.set("body", request.body);
		sms.save(null, {
			success: function(sms){
				GOOGLE.tools.firebase.set('/class/SMS/updatedAt/', {time:sms.updatedAt}).then(function(r){
					promise.resolve(sms);
				})
			}, error: function(sms, e){
				promise.reject(e);
			}
		})
		return promise;
	},
	log: function(request){
		var promise = new Parse.Promise();
		function fbUpdate(sms){
			if(sms.updatedAt){
				GOOGLE.tools.firebase.set('/class/SMS/updatedAt/', {time:sms.updatedAt}).then(function(r){
					TIMELINE.tools.upsert('SMS', sms).then(function(r){
						promise.resolve(sms)
					}, function(e){
						promise.reject(e)
					})
				})
			}else{
				promise.resolve(sms)
			}
		}
		return promise;
	}
}

//----------------------------------------------------------------------------//
exports.endpoint 			= tools.endpoint;
exports.number 				= tools.number;
exports.format 				= tools.format;
exports.call 				= call;
exports.sms 				= sms;
exports.render 				= render;
//----------------------------------------------------------------------------//


Parse.Cloud.define('phoneLog', function(request, response) {
	tools.log(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
})
Parse.Cloud.define('listPhoneNumbers', function(request, response) {
	tools.number.list(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});
Parse.Cloud.define('createEndpoint', function(request, response) {
	tools.endpoint.create(request.params).then(function(result){
		response.success(result)
	},function(e){
		response.success(e)
	})
});
Parse.Cloud.beforeSave("PhoneNumbers", function(request, response) {
	var user = request.user;
	if(request.object.get('origin') != 'cloud' && !request.object.id){
		request.object.set('origin', 'cloud');
		var number = request.object.get('number')
		tools.number.create(number).then(function(data){
			request.object.set("createdBy", user);
			if(data.rate_center){
				request.object.set("number", data.number);
				request.object.set("city", data.rate_center);
				request.object.set("state", data.region);
			}
			response.success();
		}, function(e){
			response.error(e);
		})
	}else{
		response.success();
	}
});
Parse.Cloud.afterSave("PhoneNumbers", function(request, response) {
	COMMON.savedBy(request);
	request.object.save();
});
Parse.Cloud.afterDelete("PhoneNumbers", function(request) {
	tools.phone.number.delete(request.object)
});
Parse.Cloud.beforeSave("PhoneEndpoints", function(request, response) {
	var user = request.user;
	if(request.object.get('origin') != 'cloud' && !request.object.id){
		request.object.set("createdBy", user);
		request.object.set('origin', 'cloud');
		var number = request.object.get('number')
		tools.phone.endpoint.create(request.object).then(function(result){
			request.object.set('endpoint_id', 	result.endpoint_id)
			request.object.set('username', 		result.username)
			request.object.set('alias', 		result.alias)
			response.success();
		}, function(e){
			response.error(e);
		})
	}else{
		tools.phone.endpoint.update(request.object).then(function(result){
			console.log(result)
			response.success();
		}, function(e){
			response.error(e);
		})
	}
});
Parse.Cloud.afterSave("PhoneEndpoints", function(request, response) {
	COMMON.savedBy(request);
	request.object.save();
});
Parse.Cloud.beforeDelete("PhoneEndpoints", function(request, response) {
	tools.phone.endpoint.delete(request.object).then(function(result){
		response.success(result)
	}, function(e){
		if(request.user)
			response.error(e)
		else
			response.success()
	})
});



Parse.Cloud.afterSave("SMS", function(request, response) {
	var user = Parse.User.current();
	var sms = request.object;
	tools.message.send(sms.get('localNumber'), sms.get('remoteNumber'), sms.get('message')).then(function(r){
		//Save uuid
		//add to timeline
		console.log(r);
	}, function(e){
		console.log(e);
	})
})