/*
	Offline forms do not work with the following:
	- File Input
	- Image Input
*/
var it = {};
var auth = null;
angular.module('offlineForms', ['ngRoute'])
.config(function($routeProvider) {
	$routeProvider
	.when('/:action', {
		reloadOnSearch: false,
		templateUrl: 'index.html'
	})
	.when('/:action/:id', {
		reloadOnSearch: false,
		templateUrl: 'index.html'
	})
	.otherwise({
		redirectTo: '/forms'
	});
})
.factory('config', function ($http, $q) {
	var config = {
		oauth: 			encodeURI('https://the.easybusiness.center/offline'),
		parse: {
			root: 		'https://api.parse.com/1',
			appId: 		'ETf61cYOebIkncxvVgrldjmPX4Z2acpWiKfY9wWM',
			jsKey: 		'i3MNq4GYuP6ays3LNQdijimLuaN5uOJst1n87bVy',
			restKey: 	'Wcpk6SaGnzklz5S0OhtngeYD6KJzNIoQ3VmyUgtK'
		},
		google: {
			"client_id": "821954483-q3ooncrbh8cmo8ukcupov77hfn41i6g9.apps.googleusercontent.com",
			"project_id": "easy-business-center",
			"auth_uri": "https://accounts.google.com/o/oauth2/auth",
			"token_uri": "https://accounts.google.com/o/oauth2/token",
			"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
			"redirect_uris": ["https://root-apex2060.c9users.io/oauth", "https://easybusiness.center/oauth", "http://easybusiness.center/oauth"],
			"javascript_origins": ["https://root-apex2060.c9users.io", "http://easybusiness.center", "https://easybusiness.center"],
		},
	}
	$http.defaults.headers.common['X-Parse-Application-Id'] = config.parse.appId;
	$http.defaults.headers.common['X-Parse-REST-API-Key'] = config.parse.restKey;
	$http.defaults.headers.common['Content-Type'] = 'application/json';
	return config;
})
.factory('Parse', function($rootScope, $http, $q, config){
	var Parse = function(className, immediate){
		var ds = this;
		ds.className = className;
		ds.immediate = immediate;
		ds.schema = function(){
			var deferred = $q.defer();
			$http.get(config.parse.root+'/schemas/'+ds.className).success(function(data){
				deferred.resolve(data.results)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.list = function(){
			var deferred = $q.defer();
			$http.get(config.parse.root+'/classes/'+ds.className).success(function(data){
				deferred.resolve(data.results)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.query = function(query){
			var deferred = $q.defer();
			$http.get(config.parse.root+'/classes/'+ds.className+query).success(function(data){
				deferred.resolve(data.results)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.get = function(objectId){
			var deferred = $q.defer();
			$http.get(config.parse.root+'/classes/'+ds.className+'/'+objectId).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.batch = function(arr){
			var deferred = $q.defer();
			var requests = arr.map(function(item){
				delete item.createdAt;
				delete item.updatedAt;
				if(item.objectId){
					var method = 'PUT'
					var path = '/1/classes/'+ds.className+'/'+item.objectId;
					delete item.objectId;
				}else{
					var method = 'POST'
					var path = '/1/classes/'+ds.className
				}
				return {
					method: method,
					path: path,
					body: item
				}
			})
			$http.post(config.parse.root+'/batch', {requests: requests}).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.save = function(object){
			if(!object.objectId)
				return ds.new(object)
			else
				return ds.update(object)
		}
		ds.new = function(object){
			var deferred = $q.defer();
			object = angular.copy(object);
			delete object.objectId
			delete object.updatedAt
			delete object.createdAt
			$http.post(config.parse.root+'/classes/'+ds.className, object).success(function(data){
				object = angular.extend(object, data);
				deferred.resolve(object)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.update = function(object){
			var deferred = $q.defer();
			var object2 = angular.copy(object);
			var objectId = object.objectId;
			delete object2.objectId
			delete object2.updatedAt
			delete object2.createdAt
			$http.put(config.parse.root+'/classes/'+ds.className+'/'+objectId, object2).success(function(data){
				object2 = angular.extend(object, data);
				deferred.resolve(object2)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.delete = function(object){
			var deferred = $q.defer();
			$http.delete(config.parse.root+'/classes/'+ds.className+'/'+object.objectId).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.ACL = {
			init: function(){
				if(!$rootScope.users){
					Auth.init().then(function(){
						$http.get(config.parse.root+'/classes/_User').success(function(data){
							$rootScope.users = data.results
						})
						$http.get(config.parse.root+'/classes/_Role').success(function(data){
							$rootScope.roles = data.results
						})
					});
				}
			},
			modal: function(object, message){
				object = object || {}
				var deferred = $q.defer();
				ds.ACL.init();
				$rootScope.ACL = {
					deferred: deferred,
					object: ds.ACL.unpack(object),
					message: message,
					tools: ds.ACL
				};
				$('#ACL').modal({
					keyboard: false,
					backdrop: 'static',
					show: true
				});
				return deferred.promise;
			},
			close: function(){
				var object = ds.ACL.pack($rootScope.ACL.object)
				$('#ACL').modal('hide');
				$rootScope.ACL.deferred.resolve(object)
			},
			add: function(type){
				if(!$rootScope.ACL.object.acl)
					$rootScope.ACL.object.acl = []
				$rootScope.ACL.object.acl.push({type:type})
			},
			remove: function(acl){
				var i = $rootScope.ACL.object.acl.indexOf(acl)
				$rootScope.ACL.object.acl.splice(i, 1)
			},
			verify: function(){
				//This will need to check to make sure the current user will still have access
				//If the current user will not have access, then prompt to see if they still 
				//want to set those permissions.
			},
			unpack: function(object){
				if(!object.ACL)
					return object;
				var keys = Object.keys(object.ACL)
				object.acl = [];
				keys.forEach(function(key){
					var acl = object.ACL[key]; //read write params
						acl.type = 'user';
					if(key.indexOf('*') != -1){
						acl.type = 'all';
						object.pAcl = acl;
					}else if(key.indexOf('role:') != -1){
						acl.type = 'role';
						key = key.replace('role:', '')
					}
					if(acl.type != 'all'){
						acl[acl.type] = key;
						object.acl.push(acl)
					}
				})
				return object;
			},
			pack: function(object){
				var acl = {'*':{},'role:Admin':{read:true,write:true}};
				if(!object.ACL)
					acl[Auth.objectId] = {
						read: true,
						write: true
					}
				if(object.pAcl){
					if(object.pAcl.read)
						acl['*'].read = object.pAcl.read
					if(object.pAcl.write)
						acl['*'].write = object.pAcl.write
				}
				if(object.acl)
					object.acl.forEach(function(item){
						if(item[item.type]){
							var extension = '';
							if(item.type == 'role')
								extension = 'role:'
							acl[extension+item[item.type]] = {};
							if(item.read)
								acl[extension+item[item.type]].read = item.read
							if(item.write)
								acl[extension+item[item.type]].write = item.write
						}
					})
				delete object.acl
				delete object.pAcl
				object.ACL = acl
				return object;
			}
		}
	}
	Parse.prototype.schema = function(){
		var deferred = $q.defer();
		$http.post('https://api.parse.com/1/functions/schema').success(function(data){
			deferred.resolve(data.result)
		})
		return deferred.promise;
	}
	return Parse;
})
.factory('urlSearch', function(){
	return function(key) {
		var url = window.location.href;
		url = url.toLowerCase(); // This is just to avoid case sensitiveness
		key = key.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter key
		var regex = new RegExp("[?&]" + key + "(=([^&#]*)|&|#|$)"),
		    results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
})
.factory('Auth', function (User) {
	if(!authUser){
		var authUser = new User();
			authUser.init();
	}
	return authUser;
})
.factory('Google', function (User) {
	// if(!authUser){
	// 	var authUser = new User();
	// 		authUser.init();
	// }
	return {};
})
.factory('User', function ($http, $q, $timeout, config) {
	var g = config.google;
	var defaults = {
		scopes: 'email https://www.googleapis.com/auth/plus.me',
	}

	var User = function(scopes){
		var my = this;
				
		var tools = {
			reset: function(scopes){
				my.data 		= {}
				my.status 		= 'start';
				my.data.date	= new Date();
				my.pending 		= true;
				my.sessionToken = null
				my.gAuth 		= null
				my.pAuth		= null
				my.roles 		= []
				my.profile 		= {}
				my.defer 		= $q.defer()
				if(scopes)
					my.data.scopes 	= scopes;
				else
					my.data.scopes 	= defaults.scopes;
			},
			init: function(scopes){
				if(my.status == 'start')
					tools.loadUser(true);
				return my.defer.promise;
			},
			reload: function(){
				tools.reset();
				return tools.init();
			},
			login: function(scopes){
				tools.loadUser();
				return my.defer.promise;
			},
			logout: function(){
				gapi.auth.signOut();
				tools.reset();
			},
			switchUser: function(){
				my.defer = $q.defer()
				tools.loadUser();
				return my.defer.promise;
			},
			loadUser: function(immediate){
				// alert('Load User')
				// [] TODO This has a problem... it is being called 3+ times
				tools.google.auth(immediate).then(function(gAuth){
					if(gAuth && gAuth.access_token && !gAuth.error){
						tools.parse.auth(gAuth).then(function(){
							tools.userData().then(function(){
								my.pending = false;
								my.defer.resolve(my);
							})
						})
					}else{
						my.error = gAuth;
					}
				}, function(e){
					my.error = e;
					my.defer.reject(e);
					it.me = my;
				})
			},
			is: function(roles) {
				var permissionGranted = true;
				if(typeof(roles)=='string')
					roles = [roles]
				var myRoles = [];
				for(var i=0; i<my.roles.length; i++)
					myRoles.push(my.roles[i].name)
				for(var i=0; i<roles.length; i++)
					if(myRoles.indexOf(roles[i]) == -1)
						permissionGranted = false;
				return permissionGranted;
			},
			isOr: function(roles) {
				var permissionGranted = false;
				if(typeof(roles)=='string')
					roles = [roles]
				var myRoles = [];
				for(var i=0; i<my.roles.length; i++)
					myRoles.push(my.roles[i].name)
				for(var i=0; i<roles.length; i++)
					if(myRoles.indexOf(roles[i]) != -1)
						permissionGranted = true;
				return permissionGranted;
			},
			userData: function(){
				var deferred = $q.defer();
				var profile = tools.google.profile();
				var roles 	= tools.parse.roles.list();
				$q.all([profile, roles]).then(function() {
					deferred.resolve(my);
				});
				return deferred.promise;
			},
			google: {
				offlineLink: function(){
					var services = ['email','profile','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/drive'];
					var scope = services.join("%20")
					return 'https://accounts.google.com/o/oauth2/auth?'+
						'&scope='+scope+
						'&redirect_uri='+config.oauth+
						'&response_type=code'+
						'&access_type=offline'+
						'&client_id='+config.google.client_id+
						'&approval_prompt=force'+
						'&state='+my.objectId
				},
				auth: function(immediate){
					var deferred = $q.defer();
					var req = {
							client_id: config.google.client_id, 
							scope: my.data.scopes,
							immediate: immediate,
						}
						if(!immediate){
							my.status = 'start'
							req.authuser = -1
						}
					try{
						gapi.auth.authorize(req, function(gAuth){
							my.gAuth = gAuth;
							deferred.resolve(gAuth)
						});
					}catch(e){
						console.error(e);
						//This may cause a popup which may be blocked.
						// $timeout(function(){
						// 	tools.google.auth().then(function(gAuth){
						// 		deferred.resolve(gAuth)
						// 	})
						// }, 1000)
					}
					return deferred.promise;
				},
				plus: function(){
					return gapi.client.load('plus', 'v1');
				},
				scopes: function(scopes){
					if(typeof(scopes)=='object')
						scopes = scopes.join(' ');
					if(scopes)
						my.data.scopes += ' '+scopes;
					return tools.google.auth();
				},
				profile: function(){
					var deferred = $q.defer();
					if(my.profile && my.profile.length)
						deferred.resolve(my.profile)
					else if(my.gAuth)
						$http.get('https://www.googleapis.com/plus/v1/people/me?access_token='+my.gAuth.access_token).success(function(profile){
							$http.get('https://api.parse.com/1/classes/UserProfile').then(function(response){
		 						my.profile = angular.extend(profile, response.data.results[0])
								my.profile.gId = my.profile.id;
								delete my.profile.id;
			 					deferred.resolve(my.profile);
							}).catch(function(){
		 						my.profile = profile;
								my.profile.gId = my.profile.id;
								delete my.profile.id;
			 					deferred.resolve(my.profile);
							})
		 				});
					return deferred.promise;
				}
			},
			parse: {
				auth: function(gAuth){
					var deferred = $q.defer();
					if(my.status == 'start'){
						my.status = 'looking up google user form parse.';
						$http.post('https://api.parse.com/1/functions/googleAuth', gAuth).success(function(data) {
							my.status = 'parse auth complete.';
							my.pAuth 			= data.result;
							my.objectId 		= data.result.user.objectId;
							my.sessionToken 	= data.result.token;
							// Parse.User.become(my.sessionToken)
							$http.defaults.headers.common['X-Parse-Session-Token'] = my.sessionToken;
							deferred.resolve();
						}).error(function(error){
							my.status = 'error authenticating through parse.';
							deferred.reject(error);
							tools.logout();
						})
					}else{
						deferred.resolve('Already Processing / Processed');
					}
		 			return deferred.promise;
				},
				roles: {
					list: function() {
						var deferred = $q.defer();
						if(my.roles.length) {
							deferred.resolve(my.roles)
						}else{
							var roleQry = 'where={"users":{"__type":"Pointer","className":"_User","objectId":"' + my.objectId + '"}}'
							if(my.objectId)
								$http.get('https://api.parse.com/1/classes/_Role?' + roleQry).success(function(data) {
									my.roles = data.results;
									deferred.resolve(data.results);
								}).error(function(data) {
									deferred.reject(data);
								});
						}
						return deferred.promise;
					},
					toggle: function(roleId) {
						if (typeof(roleId) != 'string')
							roleId = roleId.objectId;

						var operation = 'AddRelation';
						for (var i = 0; i < my.roles.length; i++)
							if (my.roles[i].objectId == roleId)
								operation = 'RemoveRelation';

						var request = {
							users: {
								__op: operation,
								objects: [{
									__type: "Pointer",
									className: "_User",
									objectId: my.objectId
								}]
							}
						}
						$http.put('https://api.parse.com/1/classes/_Role/' + roleId, request).success(function(data) {
							console.log('Role toggled.');
						}).error(function(error) {
							console.error(error);
						})
					}
				}
			}
		}
		tools.reset();
		
		this.tools 	= tools;
		this.is 	= tools.is;
		this.isOr 	= tools.isOr;
		this.init 	= tools.init;
	}
	return User;
})
// .controller('FormsCtrl', function($scope, $http, $q, $timeout, urlSearch, Parse, Auth, config){
// 	var Forms = new Parse('Forms');
// 	$scope.online = true;
// 	$scope.view = 'forms';
// 	$scope.Auth = Auth;
// 	auth = function(){
// 		tools.login();
// 	}

// 	var tools = $scope.tools = {
// 		init: function(){
// 			$scope.data = {};
// 			$scope.vault = localStorage.getItem('vault');
// 			if($scope.vault)
// 				$scope.vault = angular.fromJson($scope.vault)
// 			else
// 				tools.reset(true);
// 			if($scope.vault.token)
// 				$http.defaults.headers.common['X-Parse-Session-Token'] = $scope.vault.token;
// 			tools.admin.sync();
// 		},
// 		view: function(view){
// 			if(view){
// 				$scope.view = view;
// 				tools.blurForm();
// 			}
// 			if(!$scope.vault)
// 				return 'setup.html';
// 			else
// 				return $scope.view+'.html';
// 		},
// 		login: function(choose){
// 			it.h = $http;
// 			if(gapi)
// 				if(choose)
// 					Auth.tools.switchUser().then(function(user){
// 						$scope.user = user;
// 						$scope.vault.token = user.pAuth.token;
// 						tools.localSave();
// 						tools.loadForms();
// 					})
// 				else
// 					Auth.init().then(function(user){
// 						$scope.user = user;
// 						$scope.vault.token = user.pAuth.token;
// 						tools.localSave();
// 						tools.loadForms();
// 					})
// 		},
// 		localSave: function(){
// 			localStorage.setItem('vault', angular.toJson($scope.vault));
// 		},
// 		reset: function(override){
// 			if(override || prompt('Enter Admin Pin To Clear Data.') == $scope.vault.pin){
// 				$scope.vault = {
// 					pin: 		'159487',
// 					forms: 		{},
// 					data: 		{},
// 					entries: 	{}
// 				}
// 				tools.localSave();
// 				alert('Settings Reset')
// 			}else{
// 				alert('Incorrect PIN')
// 			}
// 		},
// 		resetPin: function(){
// 			if(prompt('Enter Old Pin.') == $scope.vault.pin){
// 				$scope.vault.pin = prompt('Enter New Pin');
// 				alert('Settings Reset');
// 			}else{
// 				alert('Incorrect PIN');
// 			}
// 		},
// 		loadForms: function(){
// 			Forms.list().then(function(forms){
// 				$scope.forms = forms;
// 			})
// 		},
// 		toggleForm: function(form){
// 			var vForm = $scope.vault.forms[form.objectId];
// 			if(vForm){
// 				delete $scope.vault.forms[form.objectId];
// 			}else{
// 				$scope.vault.forms[form.objectId] = form;
// 				tools.loadFormData(form);
// 			}
// 		},
// 		loadFormData: function(form){
// 			tools.form.import(form.fields, {}).then(function(fields){
// 				form.fields = fields;
// 				$scope.vault.forms[form.objectId] = form;
// 				tools.localSave();
// 			})
// 		},
// 		focusForm: function(form){
// 			if(!form.pin || prompt('Enter Pin')==form.pin){
// 				$scope.orig = form;
// 				$scope.form = angular.copy(form);
// 			}
// 		},
// 		blurForm: function(){
// 			$scope.form = null;
// 		},
// 		admin: {
// 			sync: function(){
// 				if(window.navigator.onLine){
// 					tools.admin.form.sync();
// 					tools.admin.entries.sync();
// 				}
// 			},
// 			form: {
// 				sync: function(){
// 					var keys = Object.keys($scope.vault.forms);
// 					keys.forEach(function(key){
// 						tools.loadFormData($scope.vault.forms[key]);
// 					})
// 				},
// 				focus: function(form){
// 					if($scope.vault.forms[form.objectId])
// 						$scope.form = $scope.vault.forms[form.objectId]
// 					else
// 						$scope.form = form;
// 				},
// 				save: function(form){
// 					tools.localSave();
// 				}
// 			},
// 			entries: {
// 				log: function(entry){
// 					if(!$scope.syncLog)
// 						$scope.syncLog = [];
// 					$scope.syncLog.push(entry)
// 				},
// 				sync: function(){
// 					var forms = $scope.vault.entries;
// 					var keys = Object.keys(forms);
// 					keys.forEach(function(key){
// 						forms[key].forEach(function(entry){
// 							tools.admin.entries.log(entry)
// 							if(entry.status != 'saved' && entry.status != 'error')
// 								$scope.view = 'sync';
// 								$timeout(function(){
// 									entry.status = 'syncing'
// 									$http.post('https://api.parse.com/1/functions/formSubmit', entry).success(function(data){
// 										entry.dataId = data.result.objectId;
// 										entry.status  = 'saved';
// 										tools.localSave();
// 									}).error(function(error){
// 										entry.status  = 'error';
// 										entry.error = error;
// 										tools.localSave();
// 									})
// 								}, 1000)
// 						})
// 					})
// 				},
// 				clear: function(){
// 					if(prompt('Enter PIN: ')==$scope.vault.pin){
// 						//need to add options to only clear only synced, errors, or all entries.
// 						$scope.vault.entries = {};
// 						tools.localSave();
// 					}
// 				},
// 				sClass: function(status){
// 					var c = {
// 						saved: 		'success',
// 						syncing: 	'info',
// 						error: 		'danger'
// 					}
// 					return c[status];
// 				}
// 			}
// 		},
// 		form: {
// 			import: function(fields, data){
// 				var deferredFields = $q.defer();
// 				data = data || {};
// 				//Join data to fields to display properly.
// 				function format(field, data){
// 					var deferred = $q.defer();
// 					var format = {
// 						group: function(field){
// 							tools.form.import(field.fields, data).then(function(fields){
// 								field.fields = fields;
// 								deferred.resolve(field);
// 							})
// 							return deferred.promise;
// 						},
// 						date: function(field){
// 							var d = new Date()
// 							var m = d.getTimezoneOffset();
// 							if(data)
// 								field.value = moment(data.iso).add(m, 'minutes').toDate()
// 							deferred.resolve(field);
// 							return deferred.promise;
// 						},
// 						pointer: function(field){
// 							field.Data = new Parse(field.ptr.database);
// 							var query = field.ptr.query || '';
// 							field.Data.query(query).then(function(list){
// 								field.options = list;
// 								if(data)
// 									field.value = data.objectId
// 								deferred.resolve(field);
// 							})
// 							return deferred.promise;
// 						}
// 					}
// 					var formatOptions = Object.keys(format);
// 					if(formatOptions.indexOf(field.type) != -1){
// 						return format[field.type](field)
// 					}else{
// 						field.value = data;
// 						deferred.resolve(field);
// 						return deferred.promise;
// 					}
// 				}
// 				if(!fields)
// 					deferredFields.resolve([]);
// 				else{
// 					var promises = [];
// 					for(var i=0; i<fields.length; i++){
// 						promises.push((function(field, i){
// 							var deferred = $q.defer();
// 							field.data = data; //Allows us to refer to row data within the parsed text.
							
							
// 							if(field.array){
// 								var arr = data[field.name];
// 								var promises = [];
// 								if(arr){
// 									for(var i=0; i<arr.length; i++)
// 										promises.push((function(field, data){
// 											var f = angular.copy(field);
// 											delete f.array;
// 											var formated = format(f, data);
// 											return formated;
// 										})(field, arr[i]))
// 									$q.all(promises).then(function(values){
// 										field.value = values;
// 										deferred.resolve(field);
// 									})
// 								}else{
// 									field.value = [];
// 									deferred.resolve(field);
// 								}
// 								return deferred.promise;
// 							}else{
// 								return format(field, data[field.name])
// 							}
// 						})(fields[i], i))
// 					}
// 					$q.all(promises).then(function(fields){
// 						deferredFields.resolve(fields);
// 					})
// 				}
// 				return deferredFields.promise;
// 			},
// 			export: function(fields){
// 				function format(field){
// 					var format = {
// 						group: function(field){
// 							return tools.form.export(field.fields);
// 						},
// 						pointer: function(field){
// 							if(!field.value)
// 								return null;
// 							return {
// 								__type: 	'Pointer',
// 								className: 	field.ptr.database,
// 								objectId: 	field.value
// 							}
// 						},
// 						file: function(field){
// 							//update all permissions
// 							if(field.value){
// 								field.value.forEach(function(file){
// 									field.permissions.forEach(function(permission){
// 										Google.drive.permission.set(file.id, permission).then(function(r){
// 											toastr.success('Files Shared.')
// 										}, function(e){
// 											toastr.error('Some files were not shared correctly.')
// 										})
// 									})
// 								})
// 							}
// 							return field.value;
// 						},
// 						date: function(field){
// 							var d = new Date()
// 							var m = d.getTimezoneOffset();
// 							return {
// 								__type: 	'Date',
// 								iso: 		moment(field.value).subtract(m, 'minutes').toDate()
// 							}
// 						}
// 					}
// 					var formatOptions = Object.keys(format);
// 					if(formatOptions.indexOf(field.type) != -1)
// 						return format[field.type](field)
// 					else
// 						return field.value;
// 				}
// 				var data = {}
// 				for(var i=0; i<fields.length; i++){
// 					(function(field){
// 						if(field.array){
// 							var arr = [];
// 							for(var i=0; i<field.value.length; i++){
// 								console.log('array', field.value[i])
// 								arr.push(format(field.value[i]))
// 							}
// 							data[field.name] = arr;
// 						}else{
// 							data[field.name] = format(field)
// 						}
// 					})(fields[i])
// 				}
// 				return data;
// 			},
// 			save: function(){
// 				var form = $scope.form;
// 				var data = tools.form.export(form.fields);
// 				$scope.data = angular.merge($scope.data, data);
// 				var request = {
// 					formId: form.objectId,
// 					dataId: data.objectId,
// 					data: 	data
// 				}
// 				if(!$scope.vault.entries[form.objectId])
// 					$scope.vault.entries[form.objectId] = [];
// 				$scope.vault.entries[form.objectId].push(request)
// 				tools.localSave();
				
// 				form.onSubmit = form.onSubmit || {};
// 				if(form.onSubmit.link)
// 					window.location = form.onSubmit.link
// 				else
// 					tools.form.end.modal();
// 			},
// 			get: function(formId){
// 				console.log(formId)
// 				return $scope.vault.forms[formId]
// 			},
// 			end: {
// 				modal: function(form){
// 					$('#endOptions').modal('show');
// 				},
// 				continue: function(){
// 					$scope.form = angular.copy($scope.orig);
// 					tools.form.import($scope.form.fields, $scope.data).then(function(fields){
// 						$scope.form.fields = fields;
// 						$('#endOptions').modal('hide');
// 					})
// 				},
// 				keepData: function(){
// 					delete $scope.data.objectId;
// 					$('#endOptions').modal('hide');
// 				},
// 				clearAll: function(){
// 					$scope.data = {};
// 					$scope.form = angular.copy($scope.orig);
// 					tools.form.import($scope.form.fields, {}).then(function(fields){
// 						$scope.form.fields = fields;
// 					})
// 					$('#endOptions').modal('hide');
// 				},
// 			}
// 		},
// 		data: {
// 			list: {
// 				focus: function(list){
// 					$scope.form = list;
// 				}
// 			},
// 			item: {
				
// 			}
// 		},
// 		item: {
// 			id: function($parent){
// 				var name = '';
// 				while($parent && $parent.$parent){
// 					name+=$parent.$id
// 					$parent = $parent.$parent;
// 				}
// 				return name;
// 			},
// 			pointer: function(field){
// 				// console.log('a',field)
// 			},
// 			remove: function(parent, item){
// 				parent.splice(parent.indexOf(item), 1)
// 			},
// 			addFiles: function(item){
// 				item.value = item.value || [];
// 				var ol = angular.copy(item.value)
				
// 				Google.drive.picker.generate(10).then(function(data){
// 					ol = ol.concat(data.docs)
// 					item.value = angular.extend(item.value, ol)
// 				})
// 			},
// 			addImages: function(item){
// 				cloudinary.openUploadWidget({
// 					cloud_name: $scope.config.cloudinary.name,
// 					upload_preset: $scope.config.cloudinary.preset,
// 					theme: 'white',
// 					multiple: false,
// 				},
// 				function(error, result) {
// 					if (result)
// 						item.value = {
// 							etag: result[0].etag,
// 							public_id: result[0].public_id,
// 							secure_url: result[0].secure_url,
// 							thumbnail_url: result[0].thumbnail_url,
// 							url: result[0].url
// 						}
// 					$scope.$apply();
// 				});
// 			},
// 			addArr: function(field){
// 				var instance = angular.copy(field);
// 				delete instance.array;
// 				delete instance.value;
// 				if(!Array.isArray(field.value))
// 					field.value=[];
// 				tools.form.import([instance], {}).then(function(fields){
// 					field.value.push(fields[0]);
// 				})
// 			}
// 		},
// 		random: {
// 		}
// 	}
	
// 	tools.init();
	
	
// 	it.FormsCtrl = $scope;
// })
.controller('AdminFormsCtrl', function($scope, $http, $timeout, $routeParams, Parse) {
	var Forms = new Parse('Forms');
	var tools = $scope.tools = {
		view: function(){
			var a = $routeParams.action || 'forms';
			console.log(a)
			return a+'.html';
		},
		init: function(){
			tools.form.load();
		},
		focus: function(item){
			$scope.focus = item;
		},
		state: function(check){
			return $scope.state == check;
		},
		form: {
			load: function(){
				$scope.state = 'loading'
				Forms.list().then(function(list){
					$scope.forms = list;
					$scope.state = 'loaded'
				})
			},
			refresh: function(){
				$scope.state = 'refreshing'
				Forms.list().then(function(list){
					$scope.forms = list;
					$scope.state = 'loaded'
				})
			},
			delete: function(form){
				if(confirm('Are you sure you want to delete this form?'))
					Forms.delete(form).then(function(){
						var i = $scope.forms.indexOf(form)
						$scope.forms.splice(i,1)
					})
			}
		}
	}
	tools.init();
	it.AdminFormsCtrl = $scope;
})
.controller('AdminFormsFillCtrl', function($scope, $http, $timeout, $q, $routeParams, $interpolate, Parse, Google) {
	it.http = $http;
	var Forms = new Parse('Forms');
	var Data = null;
	$scope.data = {};
	
	var tools = $scope.tools = {
		init: function(){
			tools.form.load().then(function(form){
				if($routeParams.for){
					Data.get($routeParams.for).then(function(data){
						$scope.data = data;
						tools.form.import(form.fields, data).then(function(fields){
							form.fields = fields;
						})
					})
				}else{
					tools.form.import(form.fields, {}).then(function(fields){
						form.fields = fields;
					})
				}
			})
		},
		form: {
			load: function(){
				var deferred = $q.defer();
				$timeout(function(){
					if($routeParams.action=='fill'){
						if($routeParams.id){
							Forms.get($routeParams.id).then(function(form){
								$scope.orig = form;
								$scope.form = angular.copy(form);
								Data = new Parse(form.name);
								deferred.resolve($scope.form);
							})
						}else{
							tools.form.new();
						}
					}
				}, 1000)
				return deferred.promise;
			},
			import: function(fields, data){
				var deferredFields = $q.defer();
				data = data || {};
				//Join data to fields to display properly.
				function format(field, data){
					var deferred = $q.defer();
					var format = {
						group: function(field){
							tools.form.import(field.fields, data).then(function(fields){
								field.fields = fields;
								deferred.resolve(field);
							})
							return deferred.promise;
						},
						date: function(field){
							var d = new Date()
							var m = d.getTimezoneOffset();
							field.value = moment(data.iso).add(m, 'minutes').toDate()
							deferred.resolve(field);
							return deferred.promise;
						},
						pointer: function(field){
							field.Data = new Parse(field.ptr.database);
							var query = field.ptr.query || '';
							field.Data.query(query).then(function(list){
								field.options = list;
								if(data)
									field.value = data.objectId
								deferred.resolve(field);
							})
							return deferred.promise;
						}
					}
					var formatOptions = Object.keys(format);
					if(formatOptions.indexOf(field.type) != -1){
						return format[field.type](field)
					}else{
						field.value = data;
						deferred.resolve(field);
						return deferred.promise;
					}
				}
				if(!fields)
					deferredFields.resolve([]);
				else{
					var promises = [];
					for(var i=0; i<fields.length; i++){
						promises.push((function(field, i){
							var deferred = $q.defer();
							field.data = data; //Allows us to refer to row data within the parsed text.
							
							
							if(field.array){
								var arr = data[field.name];
								var promises = [];
								if(arr){
									for(var i=0; i<arr.length; i++)
										promises.push((function(field, data){
											var f = angular.copy(field);
											delete f.array;
											var formated = format(f, data);
											return formated;
										})(field, arr[i]))
									$q.all(promises).then(function(values){
										field.value = values;
										deferred.resolve(field);
									})
								}else{
									field.value = [];
									deferred.resolve(field);
								}
								return deferred.promise;
							}else{
								return format(field, data[field.name])
							}
						})(fields[i], i))
					}
					$q.all(promises).then(function(fields){
						deferredFields.resolve(fields);
					})
				}
				return deferredFields.promise;
			},
			export: function(fields){
				function format(field){
					var format = {
						group: function(field){
							return tools.form.export(field.fields);
						},
						pointer: function(field){
							if(!field.value)
								return null;
							return {
								__type: 	'Pointer',
								className: 	field.ptr.database,
								objectId: 	field.value
							}
						},
						file: function(field){
							//update all permissions
							if(field.value){
								field.value.forEach(function(file){
									field.permissions.forEach(function(permission){
										Google.drive.permission.set(file.id, permission).then(function(r){
											toastr.success('Files Shared.')
										}, function(e){
											toastr.error('Some files were not shared correctly.')
										})
									})
								})
							}
							return field.value;
						},
						date: function(field){
							var d = new Date()
							var m = d.getTimezoneOffset();
							return {
								__type: 	'Date',
								iso: 		moment(field.value).subtract(m, 'minutes').toDate()
							}
						}
					}
					var formatOptions = Object.keys(format);
					if(formatOptions.indexOf(field.type) != -1)
						return format[field.type](field)
					else
						return field.value;
				}
				var data = {}
				for(var i=0; i<fields.length; i++){
					(function(field){
						if(field.array){
							var arr = [];
							for(var i=0; i<field.value.length; i++){
								console.log('array', field.value[i])
								arr.push(format(field.value[i]))
							}
							data[field.name] = arr;
						}else{
							data[field.name] = format(field)
						}
					})(fields[i])
				}
				return data;
			},
			save: function(){
				var form = $scope.form;
				var data = tools.form.export(form.fields);
				$scope.data = angular.merge($scope.data, data);
				var request = {
					formId: form.objectId,
					dataId: $scope.data.objectId,
					data: 	$scope.data
				}
				$http.post('https://api.parse.com/1/functions/formSubmit', request).success(function(data){
					$scope.data.objectId = data.result.objectId
					if(!form.onSubmit)
						form.onSubmit = {};
					var message = $scope.form.onSubmit.message || 'Form Saved!'
					toastr.success(message)
						
					if(form.onSubmit.link)
						window.location = form.onSubmit.link
					else
						tools.form.end.modal();
				})
			},
			end: {
				modal: function(form){
					$('#endOptions').modal('show');
				},
				continue: function(){
					$scope.form = angular.copy($scope.orig);
					tools.form.import($scope.form.fields, $scope.data).then(function(fields){
						$scope.form.fields = fields;
						$('#endOptions').modal('hide');
					})
				},
				keepData: function(){
					delete $scope.data.objectId;
					$('#endOptions').modal('hide');
				},
				clearAll: function(){
					$scope.data = {};
					$scope.form = angular.copy($scope.orig);
					tools.form.import($scope.form.fields, {}).then(function(fields){
						$scope.form.fields = fields;
					})
					$('#endOptions').modal('hide');
				},
			}
		},
		item: {
			id: function($parent){
				var name = '';
				while($parent && $parent.$parent){
					name+=$parent.$id
					$parent = $parent.$parent;
				}
				return name;
			},
			pointer: function(field){
				// console.log('a',field)
			},
			remove: function(parent, item){
				parent.splice(parent.indexOf(item), 1)
			},
			addFiles: function(item){
				item.value = item.value || [];
				var ol = angular.copy(item.value)
				
				Google.drive.picker.generate(10).then(function(data){
					ol = ol.concat(data.docs)
					item.value = angular.extend(item.value, ol)
				})
			},
			addImages: function(item){
				cloudinary.openUploadWidget({
					cloud_name: $scope.config.cloudinary.name,
					upload_preset: $scope.config.cloudinary.preset,
					theme: 'white',
					multiple: false,
				},
				function(error, result) {
					if (result)
						item.value = {
							etag: result[0].etag,
							public_id: result[0].public_id,
							secure_url: result[0].secure_url,
							thumbnail_url: result[0].thumbnail_url,
							url: result[0].url
						}
					$scope.$apply();
				});
			},
			addArr: function(field){
				var instance = angular.copy(field);
				delete instance.array;
				delete instance.value;
				if(!Array.isArray(field.value))
					field.value=[];
				tools.form.import([instance], {}).then(function(fields){
					field.value.push(fields[0]);
				})
			}
		},
		random: {
			interpolate: function(template, scope){
				return $interpolate(template)(scope)
			},
		}
	}
	
	Forms.list().then(function(list){
		$scope.forms = list;
		tools.init()
	})
	
	it.AdminFormsFillCtrl = $scope;
})