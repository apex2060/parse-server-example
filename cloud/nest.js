var CONFIG = require('./cloud/config.js');

var NEST  = {
	register: function(request, response) {
		var user = Parse.User.current();
		Parse.Cloud.useMasterKey();
		
		var Nest = Parse.Object.extend("Nest");
		var nest = new Nest();
		var code = request.body.code;
		var req = {
			code: 			request.params.code,
			client_id: 		CONFIG.KEY.NEST.client_id,
			client_secret: 	CONFIG.KEY.NEST.client_secret,
			grant_type: 	'authorization_code'
		}
		Parse.Cloud.httpRequest({
			method: 'POST',
			url: 'https://api.home.nest.com/oauth2/access_token',
			body: req
		}).then(function(result) {
			nest.set('user', user);
			nest.set('access_token', result.data.access_token)
			nest.save().then(function(obj){
				response.success(obj);
			})
		}, function(error){
			response.error(error)
		});
	},
	devices: function(request, response){
		var Nest = Parse.Object.extend("Nest");
		var query = new Parse.Query(Nest);
		query.get(request.params.nestId, {
			success: function(nest) {
				if(nest){
					var url = 'https://developer-api.nest.com/devices?auth='+nest.get('access_token')
					Parse.Cloud.httpRequest({
						method: 'GET',
						url: url
					}).then(function(result){
						response.success(result)
					}, function(error){
						Parse.Cloud.httpRequest({
							url: error.headers.Location
						}).then(function(result) {
							response.success(result.data)
						}, function(error){
							response.error(error)
						});
					})
				}else{
					response.error('Not available.')
				}
			}, error: function(e){
				response.error(e);
			}
		})
	}
}


			
			
Parse.Cloud.define('nestRegister', NEST.register);
Parse.Cloud.define('nestDevices', NEST.devices);