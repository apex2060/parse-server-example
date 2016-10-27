var CONFIG = require('cloud/config.js');

var tools = exports.tools = {
	storeAuth: function(request, response){ //Obtains a refresh token from the auth code received by Google.
	console.log(request.data)
	console.log(request.body)
	console.log(request.headers)
		var req = {
			code: 			request.param('code'),
			client_id: 		CONFIG.KEY.GOOGLE.client_id,
			client_secret: 	CONFIG.KEY.GOOGLE.client_secret,
			redirect_uri: 	CONFIG.KEY.OAUTH_URL,
			grant_type: 	'authorization_code'
		}
		Parse.Cloud.httpRequest({
			method: 'POST',
			url: 'https://www.googleapis.com/oauth2/v3/token',
			body: req
		}).then(function(result) {
			Parse.Cloud.useMasterKey();
			var gAuth2 = Parse.Object.extend("gAuth2");
			var User = Parse.Object.extend("_User");
			var user = new User();
				user.id = request.param('state');
			var qry = new Parse.Query(gAuth2);
				qry.equalTo("user", user);
			qry.first({
				success: function(gauth2){
					if(!gauth2){
						gauth2 = new gAuth2();
						gauth2.set("user", user);
					}
					gauth2.set("access_token", result.data.access_token);
					gauth2.set("refresh_token", result.data.refresh_token);
					gauth2.save(null, {
						success: function(){
							response.send('Authorization Successful!')
						}, error: function(e){
							response.send(e)
						}
					});
				}, error: function(e){
					response.send(e)
				}
			})
			
		}, function(httpResponse) {
			response.send(httpResponse)
		});
	},
	token: function(userId){
		var promise = new Parse.Promise();
		Parse.Cloud.useMasterKey();
		
		var User = Parse.Object.extend("_User");
		var user = new User();
			user.id = userId;
			
		var gAuth2 = Parse.Object.extend("gAuth2");
		var query = new Parse.Query(gAuth2);
		query.equalTo("user", user);
		query.first({
			success: function(gauth2) {
				//Update the gauth access_token
				if(gAuth2){
					var req = {
						refresh_token: 	gauth2.get('refresh_token'),
						client_id: 		CONFIG.KEY.GOOGLE.client_id,
						client_secret: 	CONFIG.KEY.GOOGLE.client_secret,
						grant_type: 	'refresh_token'
					}
					Parse.Cloud.httpRequest({
						method: 'POST',
						url: 'https://www.googleapis.com/oauth2/v3/token',
						body: req
					}).then(function(response) {
						gauth2.set("access_token", response.data.access_token);
						gauth2.save().then(function(){
							promise.resolve(gauth2)
						})
					}, function(response) {
						console.error(response)
						promise.reject(response)
					});
				}else{
					promise.reject('Not Found')
				}
			},
			error: function(error) {
				promise.reject(error);
			}
		});
		
		return promise;
	},
	calendar: {
		list: function(userId, minAccessRole){ //www.googleapis.com/calendar/v3/users/me/calendarList
			var promise = new Parse.Promise();
			tools.token(userId).then(function(gauth2){
				var access_token 	= gauth2.get('access_token')
				var url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
				if(minAccessRole)
					url += '?minAccessRole='+minAccessRole
				Parse.Cloud.httpRequest({
					method: 'GET',
					url: url,
					headers: {
						'Authorization': 'Bearer '+access_token,
						'Content-Type': 'application/json'
					}
				}).then(function(httpResponse) {
					promise.resolve(httpResponse.data)
				}, function(httpResponse) {
					promise.resolve(httpResponse)
				});
			}, function(error){
				console.error(error);
				promise.reject(error);
			})
			return promise;
		},
		event: {
			add: function(userId, calendarId, params){
				var promise = new Parse.Promise();
				tools.token(userId).then(function(gauth2){
					var access_token 	= gauth2.get('access_token')
					Parse.Cloud.httpRequest({
						method: 'POST',
						url: 'https://www.googleapis.com/calendar/v3/calendars/'+calendarId+'/events',
						headers: {
							'Authorization': 'Bearer '+access_token,
							'Content-Type': 'application/json'
						},
						body: params
					}).then(function(response) {
						promise.resolve(response.data)
					}, function(error) {
						promise.resolve(error)
					});
				}, function(error){
					console.error(error);
					promise.reject(error)
				})
				return promise;
			}
		}
	},
	drive: {
		permission: {
			insert: function(userId, fileId, permission){
				var promise = new Parse.Promise();
				tools.token(userId).then(function(gauth2){
					var access_token 	= gauth2.get('access_token')
					var url = 'https://www.googleapis.com/drive/v3/files/'+fileId+'/permissions?sendNotificationEmail=false';
					var request = {
						method: 'POST',
						url: url,
						headers: {
							'Authorization': 'Bearer '+access_token,
							'Content-Type': 'application/json'
						},
						body: permission
					}
					console.log(request)
					Parse.Cloud.httpRequest(request).then(function(httpResponse) {
						promise.resolve(httpResponse.data)
					}, function(httpResponse) {
						promise.resolve(httpResponse)
					});
				}, function(error){
					console.error(error);
				})
				return promise;
			}
		}
	},
	firebase: {
		//relativePath must be prefixed with a /
		set: function(relativePath, data){
			var promise = new Parse.Promise();
			var url = CONFIG.KEY.FIREBASE_URL+relativePath+'.json?auth='+CONFIG.KEY.FIREBASE_KEY;
			Parse.Cloud.httpRequest({
				method: 'PUT',
				url: url,
				body: JSON.stringify(data),
				headers: {
					'User-Agent': 'Parse.com Cloud Code'
				},
				success: function(httpResponse) {
					promise.resolve(httpResponse)
				},
				error: function(httpResponse) {
					promise.reject(httpResponse)
				}
			})
			return promise;
		}
	}
}



// var data = request.params;
// var access_token = data.access_token;
// Parse.Cloud.httpRequest({
// 	method: 'GET',
// 	url: 'https://www.googleapis.com/plus/v1/people/me',
// 	params: {
// 		access_token: access_token
// 	},
// 	headers: {
// 		'User-Agent': 'Parse.com Cloud Code'
// 	},
// 	success: function(httpResponse) {
// 		response.success(httpResponse);
// 	},
// 	error: function(httpResponse) {
// 		response.error(httpResponse);
// 	}
// });


Parse.Cloud.define("Firebase", function(request, response) {
	var user = Parse.User.current();
	tools.firebase.update('/random', request.params).then(function(result){
		response.success(result)
	}, function(e){
		response.error(e);
	})
});
Parse.Cloud.define("CalendarList", function(request, response) {
	var user = Parse.User.current();
	tools.calendar.list(user.id, request.params.minAccessRole).then(function(result){
		response.success(result)
	}, function(e){
		response.error(e);
	})
});
Parse.Cloud.define("DrivePermission", function(request, response) {
	var user = Parse.User.current();
	tools.drive.permission.insert(user.id, request.params.fileId, request.params.permission).then(function(result){
		response.success(result)
	}, function(e){
		response.error(e);
	})
});