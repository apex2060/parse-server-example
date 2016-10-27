var express 	= require('express'),
	moment 		= require('cloud/moment'),
	CONFIG 		= require('cloud/config.js'),
	COMMON 		= require('cloud/common.js'),
	TXT 		= require('cloud/txt.js'),
	EMAIL 		= require('cloud/email.js'),
	FORMS 		= require('cloud/forms.js'),
	GOOGLE 		= require('cloud/google.js'),
	NEST 		= require('cloud/nest.js'),
	DISPATCH 	= require('cloud/dispatch.js'),
	MERAKI 		= require('cloud/meraki.js'),
	STRIPE 		= require('cloud/financial/stripe.js')

var tools = {
	fb: 	require('cloud/communication/facebook.js'),
	email: 	require('cloud/communication/email.js'),
	fax: 	require('cloud/communication/fax.js'),
	phone: 	require('cloud/communication/phone.js'),
	snail: 	require('cloud/communication/snail.js'),
	pdf: 	require('cloud/communication/pdf.js'),
	plaid: 	require('cloud/financial/plaid.js')
}




Parse.Cloud.define('GoogleApi', function(request, response) {
	Parse.Cloud.httpRequest({
			url: 'https://content.googleapis.com/admin/directory/v1/groups',
			params: 'domain=jhcc.info&secret=gqlMH_S8gasFKbZRFKZjZHQQ'
		}).then(function(hresp) {
			response.success(hresp);
		}, function(hresp) {
			response.error(hresp)
		})
		// curl "https://content.googleapis.com/admin/directory/v1/groups?domain=jhcc.info"
		// -H "x-goog-encode-response-if-executable: base64"
		// -H "accept-encoding: gzip, deflate, sdch" 
		// -H "x-origin: https://main-jhcc-admin.c9.io" 
		// -H "accept-language: en-US,en;q=0.8" 
		// -H "authorization: Bearer ya29.nAHyM3Kra4RQCqyZLg_Bk-0O6wTb4b90BlKv9AictLJNHaDEiHw5X2pwf1mCxXQyfJNnq7E2mka7-A" 
		// -H "x-chrome-uma-enabled: 1" 
		// -H "x-client-data: CI+2yQEIprbJAQiptskBCMS2yQEI6YjKAQjRlMoBCP2VygE=" 
		// -H "pragma: no-cache" 
		// -H "x-clientdetails: appVersion=5.0"%"20(Linux"%"3B"%"20Android"%"204.3"%"3B"%"20Nexus"%"207"%"20Build"%"2FJSS15Q)"%"20AppleWebKit"%"2F537.36"%"20(KHTML"%"2C"%"20like"%"20Gecko)"%"20Chrome"%"2F42.0.2307.2"%"20Mobile"%"20Safari"%"2F537.36&platform=Win32&userAgent=Mozilla"%"2F5.0"%"20(Linux"%"3B"%"20Android"%"204.3"%"3B"%"20Nexus"%"207"%"20Build"%"2FJSS15Q)"%"20AppleWebKit"%"2F537.36"%"20(KHTML"%"2C"%"20like"%"20Gecko)"%"20Chrome"%"2F42.0.2307.2"%"20Mobile"%"20Safari"%"2F537.36" 
		// -H "user-agent: Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2307.2 Mobile Safari/537.36" 
		// -H "accept: */*" 
		// -H "cache-control: no-cache" 
		// -H "authority: content.googleapis.com" 
		// -H "referer: https://content.googleapis.com/static/proxy.html?jsh=m"%"3B"%"2F_"%"2Fscs"%"2Fapps-static"%"2F_"%"2Fjs"%"2Fk"%"3Doz.gapi.en.19737E4Lmmo.O"%"2Fm"%"3D__features__"%"2Fam"%"3DAQ"%"2Frt"%"3Dj"%"2Fd"%"3D1"%"2Ft"%"3Dzcms"%"2Frs"%"3DAGLTcCMnB74SKzl-5mWWQon_0zRpc6mkiw" 
		// -H "x-javascript-user-agent: google-api-javascript-client/1.1.0-beta" 
		// -H "x-referer: https://main-jhcc-admin.c9.io" 
		// --compressed
})

//cloudGoogleUser is not necissary, it just shows that we can get user info from the cloud side...
Parse.Cloud.define('cloudGoogleUser', function(request, response) {
	var data = request.params;
	var access_token = data.access_token;
	Parse.Cloud.httpRequest({
		method: 'GET',
		url: 'https://www.googleapis.com/plus/v1/people/me',
		params: {
			access_token: access_token
		},
		headers: {
			'User-Agent': 'Parse.com Cloud Code'
		},
		success: function(httpResponse) {
			response.success(httpResponse);
		},
		error: function(httpResponse) {
			response.error(httpResponse);
		}
	});
});

Parse.Cloud.define('initSetup', function(request, response) {
	var query = new Parse.Query(Parse.User);
	query.find({
		success: function(users) {
			if(users.length == 1){
				Parse.Cloud.useMasterKey();
				var Role = Parse.Object.extend('_Role');
				var role = new Role();
				var roleACL = new Parse.ACL();
					roleACL.setRoleReadAccess("Admin", true);
					roleACL.setRoleWriteAccess("Admin", true);
				role.set("name", "Admin");
				role.setACL(roleACL);
				role.getUsers().add(users[0]);
				role.save().then(function(){
					var Forms = Parse.Object.extend('Forms');
					var form = new Forms();
					form.set("name", "Config");
					form.set("title", "Site Settings");
					form.set("fields", [{"dataType":"Object","enabled":true,"fields":[{"dataType":"String","enabled":true,"name":"name","placeholder":"","title":"Name","type":"text"}],"name":"company","p":"","title":"Company","type":"group"},{"dataType":"Object","enabled":true,"fields":[{"array":true,"dataType":"Object","enabled":true,"fields":[{"dataType":"String","enabled":true,"name":"title","placeholder":"","title":"Display","type":"text"},{"dataType":"String","enabled":true,"name":"href","placeholder":"","title":"Link","type":"text"},{"array":false,"dataType":"String","enabled":true,"name":"target","placeholder":"_new","title":"Target","type":"text"}],"name":"links","p":"","removeable":true,"title":"Links","type":"group"},{"dataType":"Object","enabled":true,"fields":[{"array":true,"dataType":"Object","enabled":true,"fields":[{"dataType":"String","enabled":true,"name":"title","placeholder":"","title":"Display","type":"text"},{"dataType":"String","enabled":true,"name":"href","placeholder":"","title":"Link","type":"text"},{"dataType":"String","enabled":true,"name":"target","placeholder":"_new","title":"Target","type":"text"}],"name":"links","p":"","removeable":true,"title":"Links","type":"group"}],"name":"menu","p":"","title":"Menu","type":"group"}],"name":"header","p":"","title":"Header","type":"group"},{"dataType":"Object","enabled":true,"fields":[{"array":true,"dataType":"Object","enabled":true,"fields":[{"dataType":"String","enabled":true,"name":"title","placeholder":"","title":"Display","type":"text"},{"dataType":"String","enabled":true,"name":"href","placeholder":"","title":"Link","type":"text"},{"array":false,"dataType":"String","enabled":true,"name":"target","placeholder":"_new","title":"Target","type":"text"}],"name":"links","p":"","removeable":true,"title":"Links","type":"group"}],"name":"footer","p":"","title":"Footer","type":"group"},{"dataType":"Pointer","enabled":true,"name":"theme","options":[{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/cerulean/bootstrap.min.css","title":"Cerulean"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/cosmo/bootstrap.min.css","title":"Cosmo"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/cyborg/bootstrap.min.css","title":"Cyborg"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/darkly/bootstrap.min.css","title":"Darkly"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/flatly/bootstrap.min.css","title":"Flatly"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/journal/bootstrap.min.css","title":"Journal"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/lumen/bootstrap.min.css","title":"Lumen"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/paper/bootstrap.min.css","title":"Paper"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/readable/bootstrap.min.css","title":"Readable"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/sandstone/bootstrap.min.css","title":"Sandstone"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/simplex/bootstrap.min.css","title":"Simplex"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/slate/bootstrap.min.css","title":"Slate"},{"name":"https://maxcdn.bootstrapcdn.com/bootswatch/3.3.6/spacelab/bootstrap.min.css","title":"SpaceLab"}],"parseClass":"unassigned","parseQuery":"","title":"Theme","type":"select"},{"dataType":"Object","enabled":true,"fields":[{"dataType":"String","enabled":true,"name":"cloud_name","placeholder":"","title":"Cloud Name","type":"text"},{"dataType":"String","enabled":true,"name":"preset","placeholder":"","title":"Upload Preset","type":"text"}],"name":"cloudinary","p":"For Pictures","title":"Cloudinary","type":"group"},{"dataType":"Object","enabled":true,"name":"background","title":"Background Image","type":"image"},{"dataType":"Pointer","enabled":true,"name":"bgSize","options":[{"name":"cover","title":"Cover"},{"name":"","title":"Default"}],"parseClass":"unassigned","parseQuery":"","title":"Background Size","type":"select"}])
					form.save(null, {success:function(){
						response.success('Done!')
					}})
				})
			}
		}
	});
});
var TokenRequest = Parse.Object.extend("TokenRequest");
var TokenStorage = Parse.Object.extend("TokenStorage");
Parse.Cloud.define('googleAuth', function(request, response) {
	var data = request.params;
	var access_token = data.access_token;
	if (!(data && data.access_token)) {
		response.error('Invalid auth response received.');
		return;
	}

	Parse.Cloud.useMasterKey();
	Parse.Promise.as().then(function() {
		return getGoogleUserData(data.access_token);
	}).then(function(httpResponse) {
		var userData = httpResponse.data;
		if (userData && userData.id) {
			// if(CONFIG.KEY.APPS_DOMAIN && userData.domain != CONFIG.KEY.APPS_DOMAIN)
			//  return Parse.Promise.error({message: "Sorry, only members of "+CONFIG.KEY.APPS_DOMAIN+' can login.', profile:userData});
			// else
			return upsertGoogleUser(data.access_token, userData);
		}
		else {
			return Parse.Promise.error("Unable to parse Google data");
		}
	
	}).then(function(user) {
		response.success({
			version: '1',
			user: user,
			token: user.getSessionToken()
		});
	}, function(error) {
		if (error && error.access_token && error.error) {
			error = error.access_token + ' ' + error.error;
		}
		response.error(JSON.stringify(error));
	});
});
var getGoogleUserData = function(access_token) {
	return Parse.Cloud.httpRequest({
		method: 'GET',
		url: 'https://www.googleapis.com/plus/v1/people/me',
		params: {
			access_token: access_token
		},
		headers: {
			'User-Agent': 'Parse.com Cloud Code'
		}
	});
}
var upsertGoogleUser = function(accessToken, googleData) {
	var query = new Parse.Query(TokenStorage);
	query.equalTo('accountId', googleData.id);
	return query.first({
		useMasterKey: true
	}).then(function(tokenData) {
		if (!tokenData) {
			return newGoogleUser(accessToken, googleData);
		}
		var user = tokenData.get('user');
		return user.fetch({
			useMasterKey: true
		}).then(function(user) {
			if (accessToken !== tokenData.get('access_token')) {
				tokenData.set('access_token', accessToken);
			}
			return tokenData.save(null, {
				useMasterKey: true
			});
		}).then(function(obj) {
			return Parse.Promise.as(user);
		});
	});
}
var newGoogleUser = function(accessToken, googleData) {
	var restrictedAcl = new Parse.ACL();
	restrictedAcl.setPublicReadAccess(false);
	restrictedAcl.setPublicWriteAccess(false);

	var _ = require('underscore');
	var Buffer = require('buffer').Buffer;
	var user = new Parse.User();
	var username = googleData.emails[0].value;
	var password = new Buffer(24);
	_.times(24, function(i) {
		password.set(i, _.random(0, 255));
	});

	user.set("username", username);
	user.set("password", password.toString('base64'));
	// user.set("email", googleData.emails[0].value);
	// user.set("firstName", googleData.name.givenName);
	// user.set("lastName", googleData.name.familyName);
	user.set("accountType", 'g');
	return user.signUp().then(function(user) {
		var ts = new TokenStorage();
		ts.set('user', user);
		ts.set('accountId', googleData.id);
		ts.set('access_token', accessToken);
		ts.setACL(restrictedAcl);
		return ts.save(null, {
			useMasterKey: true
		});
	}).then(function(tokenStorage) {
		return upsertGoogleUser(accessToken, googleData);
	});
}


Parse.Cloud.beforeSave("Alerts", function(request, response) {
	COMMON.savedBy(request);
	response.success();
});
Parse.Cloud.beforeSave("Documents", function(request, response) {
	COMMON.savedBy(request);
	response.success();
});





var app = express();
app.use(express.bodyParser());
app.use(express.json());
app.use(express.urlencoded());

app.get('/torque', function(request, response) {
	var TorqueTrip = Parse.Object.extend("TorqueTrip");
	var torqueTrip = new TorqueTrip();
	torqueTrip.set("query", request.query);
	torqueTrip.set("body", request.body);
	torqueTrip.save();
	console.log('Torque Received')
	response.send('Thanks for the Report!');
});
app.post('/syncFaxes', function(request, response) {
	//Why do it this way?  Phaxio sends multi-part form data.  We can not receive such in the parse sdk
 	Parse.Cloud.httpRequest({
		method: "POST",
		url: "https://api.parse.com/1/jobs/syncFaxes",
		headers: {
			"X-Parse-Application-Id": CONFIG.KEY.PARSE_APPID,
			"X-Parse-Master-Key": CONFIG.KEY.PARSE_MASTER,
			"Content-Type": "application/json"
		},
		body: {}
	}).then(function(){
		response.send('Sync In Progress')
	})
});




app.get('/facebook', function(request, response) {
	if (request.query['hub.mode'] === 'subscribe' && request.query['hub.verify_token'] === CONFIG.KEY.FACEBOOK.verify_token) {
		console.log("Validating webhook");
		response.send(request.query['hub.challenge']);
	}
	else {
		console.error("Failed validation. Make sure the validation tokens match.");
		response.sendStatus(403);
	}
});

app.post('/facebook', function(request, response) {
	console.log('FB post')
	function converse(entryId){
		return Parse.Cloud.httpRequest({
			method: "POST",
			url: "https://api.parse.com/1/jobs/fbCoverse",
			headers: {
				"X-Parse-Application-Id": CONFIG.KEY.PARSE_APPID,
				"X-Parse-Master-Key": CONFIG.KEY.PARSE_MASTER,
				"Content-Type": "application/json"
			},
			body: {entryId: entryId}
		})
	}
	var action = {
		message: function(id, event){
			var promise = new Parse.Promise();
			var Facebook = Parse.Object.extend("Facebook");
			var facebook = new Facebook();
			facebook.set('recipientId', event.recipient.id)
			facebook.set('senderId', event.sender.id)
			facebook.set('seq', event.message.seq)
			facebook.set('text', event.message.text)
			facebook.set('msg', event.message)
			facebook.save().then(function(r){
				converse(r.id).then(function(r){
					promise.resolve('Thanks!')
				}, function(e){
					console.error(e)
					promise.resolve('Okay.')
				})
			}, function(e){
				console.error(e)
				promise.resolve('Okay.')
			})
			return promise;
		}
	}
	
	if(request.body.entry){
		request.body.entry.forEach(function(entry){
			entry.messaging.forEach(function(event){
				if(event.message){
					action.message(entry.id, event).then(function(r){
						response.send(r)
					})
				}
			})
		})
	}
});

app.post('/SMS', function(request, response) {
	tools.phone.sms.in(request).then(function(r){
		response.send(r)
	}, function(e){
		response.send(e)
	})
});
app.post('/switchBoard', function(request, response) {
	response.type('text/xml');
	var render = tools.phone.render;
	var Call = tools.phone.call;
	Parse.Cloud.useMasterKey() 
	
	Call.log(request.body).then(function(call){
		switch(request.body.Event){
			case 'StartApp':
				if(call.get('direction') == 'inbound'){
					Call.in(request.body, call).then(function(xml){
						console.log('xml:'+xml)
						response.send(xml)
					})
				}else{
					Call.out(request.body, call).then(function(xml){
						console.log('xml:'+xml)
						response.send(xml)
					})
				}
			break;
			case 'Redirect':
				Call.redirect(request.body, call).then(function(xml){
					console.log('xml:'+xml)
					response.send(xml)
				})
			break;
			case 'DialAnswer':
				Call.connect(request.body, call).then(function(result){
					response.send('thanks')
				})
			break;
			case 'Record':
				Call.record(request.body, call).then(function(result){
					response.send(result)
				})
			break;
			default: 
				console.log('Other')
				console.log(request.body)
				response.send('Thanks')
		}
	})
});

app.post('/PDFschema', function(request, response) {
	tools.pdf.schema(request.body.document_id).then(function(r){
		response.send(r)
	}, function(e){
		response.send(e)
	})
});
app.post('/PDFfill', function(request, response) {
	tools.pdf.fill(request.body.document_id, request.body.data).then(function(r){
		response.send(r)
	}, function(e){
		response.send(e)
	})
});

//upload PDF
app.post('/PDF', function(request, response) {
	tools.pdf.request(request.body.path, request.body.params, request.body.method, request.body.response).then(function(r){
		response.send(r)
	}, function(e){
		response.send(e)
	})
});

app.get('/PDF', function(request, response) {
	tools.pdf.get(request.query.document_id).then(function(r){
		response.writeHead(200, {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'attachment; filename=form.pdf',
			'Content-Length': r.buffer.length
		});
		response.end(r.buffer)
	}, function(e){
		response.send(e)
	})
});


app.post('/meraki', MERAKI.locations);
app.get('/meraki', function(request, response) {
	response.send(CONFIG.KEY.MERAKI);
});
app.post('/log', function(request, response) {
	var HttpLog = Parse.Object.extend("HttpLog");
	var log = new HttpLog();
	log.set("query", request.query);
	log.set("body", request.body);
	log.set("params", request.params);
	log.save().then(function(){
		response.send('Thanks')
	})
});

var auth = express.basicAuth('user', 'pass');
app.get('/contacts', auth, function(request, response){
	var HttpLog = Parse.Object.extend("HttpLog");
	var log = new HttpLog();
	log.set("query", request.query);
	log.set("body", request.body);
	log.set("params", request.params);
	log.save().then(function(){
		response.send('Thanks')
	})
})
app.post('/contacts', auth, function(request, response){
	var HttpLog = Parse.Object.extend("HttpLog");
	var log = new HttpLog();
	log.set("query", request.query);
	log.set("body", request.body);
	log.set("params", request.params);
	log.save().then(function(){
		response.send('Thanks')
	})
})

app.get('/oauth', function(request, response){
	return GOOGLE.tools.storeAuth(request, response);
})


Parse.Cloud.define('api', function(request, response) {
	Parse.Cloud.httpRequest({
		method: request.params.method,
		url: 	CONFIG.KEY.DREAMFACTORY.url+request.params.path,
		headers: {
			"X-DreamFactory-Api-Key": 	CONFIG.KEY.DREAMFACTORY.api_key,
			"Content-Type": 			"application/json"
		},
		body: {}
	}).then(function(http){
		response.success(http.data)
	}, function(e){
		response.send(e)
	})
})

//Acts as a proxy to DreamFactory
app.post('/api', function(request, response) {
	Parse.Cloud.httpRequest({
		method: request.body.method,
		url: 	CONFIG.KEY.DREAMFACTORY.url+request.body.path,
		headers: {
			"X-DreamFactory-Api-Key": 	CONFIG.KEY.DREAMFACTORY.api_key,
			"Content-Type": 			"application/json"
		},
		body: {}
	}).then(function(http){
		response.send(http.data)
	}, function(e){
		response.send(e)
	})
});

app.get('/calendar', function(request, response){
	var calendarId 		= 'jhcc.info_61ngbdl0cml49sl7rkogiibq8c@group.calendar.google.com'
	var params = {
		start: {
			date: "2015-11-10"
		},
		end: {
			date: "2015-11-15"
		},
		summary: "1 step closer",
	};
	
	GOOGLE.tools.calendar.event.add(calendarId, params).then(function(success){
		response.send(success)
	}, function(error){
		response.send(error)
	})
})

app.post('/mailToCalendar', function(request, response){
	Parse.Cloud.useMasterKey();
	
	var calendarId 		= 'jhcc.info_61ngbdl0cml49sl7rkogiibq8c@group.calendar.google.com'
	var userId			= 'CJzuPMO78T';
	function split(text){
		var entries = [];
		var fields = ['Employee Name: ','Employee No: ','Division: ','Leave Type: ','Start Date: ','End Date: ','Total Hours: ','Comments: '];
		for(var i=0; i<fields.length; i++){
			var temp = text.split(fields[i]);
			if(temp.length>1){
				temp = temp[1].split('</p>');
				entries.push(temp[0]);
			}else{
				console.error('Could not parse item #'+i+': '+fields[i])
				console.error(temp)
				entries.push('');
			}
		}
		return entries;
	}
	if(request.body['Subject'].indexOf('Request for Time Off') != -1){
		var entries = split(request.body['body-html'])
		var params = {
			start: {
				date: moment(entries[4]).format('YYYY-MM-DD')
			},
			end: {
				date: moment(entries[5]).add("days", 1).format('YYYY-MM-DD')
			},
			summary: entries[0],
			description: entries[7],
			status: 'tentative'
		}
		var Email = Parse.Object.extend("Email");
		var email = new Email();
		email.set('testId', '1');
		email.set('entries', entries);
		email.set("data", request.body);
		email.save().then(function(){
			console.log(params)
			GOOGLE.tools.calendar.event.add(userId, calendarId, params).then(function(success){
				email.set('gCal', success);
				email.save().then(function(){
					response.send(success)
				}, function(e){
					response.error(e)
				})
			}, function(e){
				response.error(e)
			})
		})
	}else{
		console.log('a request was made with the incorrect subject.')
		var Log = Parse.Object.extend("Log");
		var log = new Log();
		log.set('request', request.body);
		log.save().then(function(){
			response.send('Sorry, the formating was incorrect.')
		})
	}
})


app.listen();