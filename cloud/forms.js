var moment 		= require('moment')
var CONFIG 		= require('./cloud/config.js')
var COMMON 		= require('./cloud/common.js')
var EMAIL 		= require('./cloud/email.js')
var GOOGLE 		= require('./cloud/google.js')

//Each user must have access to the data AND the form. 

/*
	Params: formId, dataId, data
*/
Parse.Cloud.define("formSubmit", function(request, response) {
	var params = request.params;
	var user = Parse.User.current();
	// if (!user)
	// 	response.error('You must be logged in first.');
	
	function save(form, params){
		var promise = new Parse.Promise();
		var fields = form.get('fields');
		var onSubmit = form.get('onSubmit') || {};

		var Obj = Parse.Object.extend(form.get('name'));
		if(params.dataId){
			var query = new Parse.Query(Obj);
			query.get(params.dataId, {
				success: function(obj){
					if(obj){
						var fields = form.get('fields');
						for(var i=0; i<fields.length; i++)
							obj.set(fields[i].name, params.data[fields[i].name])
						
						if(onSubmit.savedBy)
							obj.set(onSubmit.savedBy, user)
						if(onSubmit.savedOn)
							obj.set(onSubmit.savedOn, params.data[onSubmit.savedOn])
						if(onSubmit.savedAt)
							obj.set(onSubmit.savedAt, params.data[onSubmit.savedAt])
						if(params.status)
							obj.set('STATUS', params.status)
						
						obj.set('ACL', onSubmit.ACL)
						
						obj.save(null, {
							success: function(result){
								GOOGLE.tools.firebase.set('/class/'+form.get('name')+'/updatedAt/', {time:result.updatedAt}).then(function(r){
									promise.resolve(result)
								}, function(e){
									console.error(e)
									promise.resolve(result)
								})
							}, error: function(r, e){
								console.error(e)
								promise.reject(e);
							}
						})
					}else{
						promise.reject('Object Not Found')
					}
				}, error: function(e){
					promise.reject('Object Not Found')
				}
			});
		}else{
			var obj = new Obj();
			var fields = form.get('fields');
			for(var i=0; i<fields.length; i++)
				obj.set(fields[i].name, params.data[fields[i].name])
			
			if(onSubmit.savedBy)
				obj.set(onSubmit.savedBy, user)
			if(onSubmit.savedOn)
				obj.set(onSubmit.savedOn, params.data[onSubmit.savedOn])
			if(onSubmit.savedAt)
				obj.set(onSubmit.savedAt, params.data[onSubmit.savedAt])
			if(params.status)
				obj.set('STATUS', params.status)
			obj.set('ACL', onSubmit.ACL)
			
			obj.save(null, {
				success: function(result){
					GOOGLE.tools.firebase.set('/class/'+form.get('name')+'/updatedAt/', {time:result.updatedAt}).then(function(r){
						promise.resolve(result)
					}, function(e){
						console.error(e)
						promise.reject('Error saving data to firebase.')
					})
				}, error: function(r, e){
					console.error(e)
					promise.reject(e);
				}
			})
		}
		return promise;
	}
	function discover(what, data){
		var promise = new Parse.Promise();
		if(!what || typeof what != 'string')
			promise.resolve(data)
		else{
			what = what.split('.');
			var attr = what.shift();
			if(what.length > 0){
				if(data[attr] && data[attr].__type == 'Pointer'){
					var ParseClass = Parse.Object.extend(data[attr].className);
					var query = new Parse.Query(ParseClass);
					query.get(data[attr].objectId, {
						success: function(object) {
							var attr = what.shift();
							discover(what.join('.'), object.get(attr)).then(function(result){
								promise.resolve(result);
							})
						},
						error: function(object, error) {
							promise.reject(error);
						}
					});
				}else{
					if(Array.isArray(data[attr])){
						var dps = data[attr].map(function(item){
							return discover(what.join('.'), item)
						})
						Parse.Promise.when(dps).then(function(){
							var arr = Array.prototype.slice.call(arguments);
							promise.resolve(arr);
						})
					}else{
						discover(what.join('.'), data[attr]).then(function(result){
							promise.resolve(result)
						})
					}
				}
			}else{
				promise.resolve(data[attr])
			}
		}
		return promise;
	}
	function discoverArray(what, data){
		if(!what || typeof what != 'string')
			return data;
		what = what.split('.');
		var attr = what.shift();
		if(Array.isArray(data[attr]))
			return data[attr]
		else
			return discoverArray(what.join('.'), data[attr])
	}
	function email(form, data, action){
		Parse.Cloud.useMasterKey();
		var emailPromise = new Parse.Promise();
		var userId 		= action.userId;
		var form 		= form.toJSON();
		var data 		= data.toJSON();
		function message(scope){
			var promise = new Parse.Promise();
			var packet = {
				from: 		'workflow@'+CONFIG.KEY.MAILGUN_URL,
				to: 		scope.to,
				subject: 	COMMON.interpolate(action.subject, scope),
				html: 		COMMON.interpolate(action.body, scope)
			}
			
			EMAIL.send(packet).then(function(result){
				promise.resolve(result)
			}, function(e){
				promise.reject(e);
			})
			return promise;
		}
		
		if(action.to && action.to.indexOf('@') != -1){
			var scope = {
				to: 		action.to,
				form: 		form,
				data: 		data,
				user: 		user
			}
			return message(scope).then(function(data){
				emailPromise.resolve(data);
			}, function(e){
				emailPromise.reject(e);
			})
		}else{
			discover(action.to, data).then(function(to){
				if(Array.isArray(to)){
					var scopes = discoverArray(action.to, data)
				}else{
					to = [to];
					var scopes = to;
				}
				var promises = scopes.map(function(scope, i){
					scope = {
						to: 		to[i],
						form: 		form,
						data: 		data,
						self: 		scope,
						user: 		user
					}
					return message(scope);
				})
				return Parse.Promise.when(promises).then(function(data){
					emailPromise.resolve(data);
				})
			}, function(e){
				emailPromise.reject(e);
			})
		}
			
		return emailPromise;
	}
	function calendar(form, data, action){
		var calPromise 	= new Parse.Promise();
		var calendarId 	= action.calendar.id;
		var userId 		= action.userId;
		var form 		= form.toJSON();
		var data 		= data.toJSON();
		function event(scope){
			var promise = new Parse.Promise();
			var params = {
				// Full Day Events
				// start: {
				// 	date: moment(scope.startDate.iso).format('YYYY-MM-DD')
				// },
				// end: {
				// 	date: moment(scope.endDate.iso).format('YYYY-MM-DD')
				// },
				// Include Start Time
				start: {
					dateTime: moment(scope.startDate.iso).format('YYYY-MM-DDTHH:mm:ssZ')
				},
				end: {
					dateTime: moment(scope.endDate.iso).format('YYYY-MM-DDTHH:mm:ssZ')
				},
				summary: COMMON.interpolate(action.title, scope),
				description: COMMON.interpolate(action.description, scope),
			};
			
			GOOGLE.tools.calendar.event.add(userId, calendarId, params).then(function(success) {
				promise.resolve(success)
			}, function(error) {
				promise.reject(error)
			})
			return promise;
		}

		action.startDateCol = action.startDateCol 	|| 'updatedAt'
		action.endDateCol 	= action.endDateCol 	|| 'updatedAt'
		action.title 		= action.title 			|| 'objectId'
		
		var dates = []
			dates.push(discover(action.startDateCol, data))
			dates.push(discover(action.endDateCol, data))

		Parse.Promise.when(dates).then(function(startDate, endDate){
			var scopes = [{}]
			if(Array.isArray(startDate))
				scopes = discoverArray(action.startDateCol, data)
			else if(Array.isArray(endDate))
				scopes = discoverArray(action.endDateCol, data)
				
			if(!Array.isArray(startDate))
				startDate = [startDate];
			if(!Array.isArray(endDate))
				endDate = [endDate];
				
			var promises = scopes.map(function(scope, i){
				scope = {
					startDate: 	startDate[i] 	|| startDate,
					endDate: 	endDate[i] 		|| endDate,
					form: 		form,
					data: 		data,
					self: 		scope,
					user: 		user
				}
				return event(scope);
			})
			Parse.Promise.when(promises).then(function(data){
				calPromise.resolve(data);
			}, function(e){
				response.error(e)
			})
		}, function(e){
			response.error(e);
		})
		
		//If either date in the calendar are from an array, get a relative path for that data.
		
		return calPromise;
	}
	
	var Form = Parse.Object.extend('Forms')
	var query = new Parse.Query(Form);
	query.get(request.params.formId, {
		success: function(form){
			save(form, request.params).then(function(data){
				var actions = form.get('actions');
				if(actions){
					var promises = [];
					for(var i=0; i<actions.length; i++){
						if(actions[i].active){
							if(actions[i].type == 'email')
								promises.push(email(form, data, actions[i]))
							else if(actions[i].type == 'calendar')
								promises.push(calendar(form, data, actions[i]))
						}
					}
					Parse.Promise.when(promises).then(function(responses){
						response.success(data)
					}, function(e){
						response.error(e);
					})
				}else{
					response.success(data)
				}
			}, function(e){
				response.error(e);
			})
		},
		error: function(r,e){
			response.error(e);
		}
	});
});


Parse.Cloud.define("schema", function(request, response) {
	function schema(){
		Parse.Cloud.httpRequest({
			method: 'GET',
			url: 'https://api.parse.com/1/schemas',
			headers: {
				'X-Parse-Application-Id': CONFIG.KEY.PARSE_APPID,
				'X-Parse-Master-Key': CONFIG.KEY.PARSE_MASTER,
				'Content-Type': 'application/json'
			}
		}).then(function(httpResponse){
			response.success(httpResponse.data.results);
		}, function(e){
			response.error(e);
		});
	}
	
	if(true){
		if(Parse.User.current())
			schema();
		else
			response.error({message: 'Insufficient Permissions'});
	}else{
		var query = (new Parse.Query(Parse.Role));
		query.equalTo("name", "Admin");
		query.equalTo("users", Parse.User.current());
		query.first().then(function(adminRole) {
			if(adminRole){
				schema();
			}else{
				response.error({message: 'Insufficient Permissions'});
			}
		});
	}

});