/*
	Offline forms do not work with the following:
	- File Input
	- Image Input
*/
var it = {};
var auth = null;
angular.module('offlineForms', [])
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
.factory('Auth', function (User) {
	if(!authUser){
		var authUser = new User();
			authUser.init();
	}
	return authUser;
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
//Pouch Parse Data Service
.factory('Parse', function($http, $q, config, Auth){
	//Offline FIRST!!!
	//Listen Capable
	/*
		This still needs to listen for remote changes, and update at appropriate
		time.  It needs to save dependancies prior to saving any object with
		pointers and then update the local object pointers to the correct 
		objectId prior to saving to parse.
		Should the local pointers always point to the localId?  and then be 
		shuffled one way or the other when communicating with parse?
		
		When remote changes occur a timestamp of updatedAt will be modified in firebase
		Pull all records with updatedAt since last sync timestamp.
		
		On Save, attempt to save remotly.  If offline or fail, wait until connection
		then sync all on re-connect.
	*/
	var Parse = function(className){
		var ds = this;
		it[className] = ds;
		ds.settings = {
			className: 		'Ud_Untitled',	//REQUIRED
			onChange: 		[],				//OPTIONAL (will call function when remote change occurs.)
		}
		
		if(typeof(className) == 'object')
			ds.settings = angular.extend(ds.settings, className)
		else
			ds.settings.className = className;
		
		ds.db = new PouchDB(ds.settings.className);
		ds._parse = {
			//generic save to parse.  Called from sync (after saved locally)
			preparePtrs: function(object){
				var deferred = $q.defer();
				var object = angular.copy(object);
				//what about an array of pointers!?!?!?!
				//what about an object with an array of pointers!?!?!
				//what if there is circular reasoning.
				//it would require one to remove a circular pointer, save the obj, re-add the pointer, and re-save.
				function assoc(ptr){
					var assocDefer = $q.defer();
					var Tdb = new Parse(ptr.className);
					Tdb.tools.localGet(ptr.localId).then(function(tobj){
						if(tobj.objectId){
							ptr.objectId = tobj.objectId;
							assocDefer.resolve(ptr);
						}else{
							Tdb._parse.save(tobj).then(function(sobj){
								ptr.objectId = sobj.objectId;
								assocDefer.resolve(ptr);
							})
						}
					})
					return assocDefer.promise;
				}
				function type(itm){
					if(!itm){
						return 'undefined'
					}else if(itm.__type == 'Pointer' && itm.localId)
						return 'pointer'
					else if(Array.isArray(itm)){
						return 'array'
					}else if(typeof(itm) == 'object'){
						return 'object'
					}
				}
				function dep(obj){
					var depList = {
						dep: [],
						obj: []
					}
					if(type(obj) == 'object'){
						var keys = Object.keys(obj);
						keys.forEach(function(key){
							var list = dep(obj[key])
							depList.dep = depList.dep.concat(list.dep)
							depList.obj = depList.obj.concat(list.obj)
						})
					}else if(type(obj) == 'array'){
						obj.forEach(function(itm){
							var list = dep(itm)
							depList.dep = depList.dep.concat(itm.dep)
							depList.obj = depList.obj.concat(itm.obj)
						})
					}else if(type(obj) == 'pointer'){
						var promise = assoc(obj);
						depList.dep.push(promise)
						depList.obj.push(obj)
					}else{
						return {dep:[],obj:[]}
					}
					return depList;
				}
				
				var d = dep(object);
				$q.all(d.dep).then(function(results){
					results.forEach(function(itm, i){
						d.obj.objectId = itm.objectId;
						delete d.obj.localId;
					})
					deferred.resolve(object);
				})
				return deferred.promise;
			},
			prepare: function(object){
				object = angular.copy(object);
				object.pdbId 	= object._id;
				object.pdbRev 	= object._rev;
				object.pdbState = 'savedRemotly'
				delete object._id
				delete object._rev
				delete object.objectId
				delete object.updatedAt
				delete object.createdAt
				return object;
			},
			save: function(object){
				//prepare for remote save
				//keep local pointers
				//update local (createdAt, updatedAt, objectId)
				var deferred = $q.defer();
				ds._parse.preparePtrs(object).then(function(o2){
					if(!object.objectId){
						ds._parse.new(o2).then(function(obj){
							object.objectId = obj.objectId;
							object.createdAt = obj.createdAt;
							ds.db.put(object).then(function(r) {
								object.pdbState = 'syncSuccess';
								object._id = r.id;
								object._rev = r.rev;
								deferred.resolve(object);
							}).catch(function(e) {
								console.error(e);
							});
							deferred.resolve(obj);
						})
					}else{
						ds._parse.update(o2).then(function(obj){
							object.updatedAt = object.updatedAt;
							ds.db.put(object).then(function(r) {
								object.pdbState = 'syncSuccess';
								object._id = r.id;
								object._rev = r.rev;
								deferred.resolve(object);
							}).catch(function(e) {
								console.error(e);
							});
						})
					}
				})
				return deferred.promise;
			},
			new: function(object){
				var deferred = $q.defer();
				object = ds._parse.prepare(object);
				$http.post(config.parse.root+'/classes/'+ds.settings.className, object).success(function(data){
					object = angular.extend(object, data);
					deferred.resolve(object)
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			},
			update: function(object){
				var deferred = $q.defer();
				var objectId = object.objectId;
				var object2 = ds._parse.prepare(object);
				$http.put(config.parse.root+'/classes/'+ds.settings.className+'/'+objectId, object2).success(function(data){
					object2 = angular.extend(object, data);
					deferred.resolve(object2)
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			}
		}
		ds._tools = {
			//once an item is pulled from parse, this saves it locally.
			prepare: function(object){
				if(object.pdbId)
					object._id 		= object.pdbId;
				else
					object._id 		= object.objectId;
				object.pdbState = 'inSync'
				delete object.pdbId
				delete object.pdbRev
				return object;
			},
			updateLocal: function(object){
				var deferred = $q.defer();
				object = ds._tools.prepare(object);
				ds.db.get(object._id).then(function(o2){
					object._rev = o2._rev;
					ds.db.put(object).then(function(response) {
						deferred.resolve(response)
					}).catch(function(e) {
						deferred.reject(e)
					})
				}).catch(function(e) {
					deferred.reject(e)
				})
				return deferred.promise;
			},
			//pulls an item from parse and then saves it locally
			pull: function(objectId){
				var deferred = $q.defer();
				$http.get(config.parse.root+'/classes/'+ds.settings.className+'/'+objectId).success(function(object){
					object = ds._tools.prepare(object)
					ds._tools.updateLocal(object).then(function(r){
						deferred.resolve(r)
					}, function(e){
						deferred.reject(e);
					})
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			},
			//pulls 1000 items from parse and saves them locally.
			pullNsave: function(skip){
				var deferred = $q.defer();
				var qry = '?limit=1000';
				if(skip)
					qry += '&skip='+skip
				$http.get(config.parse.root+'/classes/'+ds.settings.className+qry).success(function(data){
					var list = data.results.map(ds._tools.prepare)
					ds.db.bulkDocs(list).then(function(result) {
						deferred.resolve(list)
					}).catch(function(e) {
						deferred.reject(e);
					});
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			},
			//calls pullNsave until all items are saved locally.  Sets up a new DB if needed.
			pullAll: function(skip){
				var deferred = $q.defer();
				function groove(skip){
					skip = skip || 0;
					ds._tools.pullNsave(skip).then(function(list){
						if(list.length == 1000)
							ds._tools.pullAll(skip+list.length).then(function(){
								deferred.resolve();
							})
						else
							deferred.resolve();
					})
				}
				if(!skip)
					ds.db.destroy().then(function(success){
						ds.db = new PouchDB(ds.settings.className);
						ds.db.createIndex({
							index: {
								fields: ['objectId','pdbState']
							}
						});
						groove(skip);
					}).catch(function(e){
						console.error(e);
					})
				else
					groove(skip)
				return deferred.promise;
			},
			//Saves dirty local data to parse.
			sync: function(){
				var deferred = $q.defer();
				ds.db.find({selector:{pdbState:'savedLocally'}})
				.then(function(syncList) {
					syncList.docs.forEach(function(item){
						ds._parse.save(item);
					})
				}).catch(function(e) {
					deferred.reject(e);
				});
				return deferred.promise;
			},
			id: function() {
				var genId = Date.now();
				var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
				for (var i = 0; i < 5; i++)
					genId += possible.charAt(Math.floor(Math.random() * possible.length));
				return genId;
			}
		}
		ds.tools = {
			list: function(){
				var deferred = $q.defer();
				ds.db.info().then(function(dbInfo){
					if(dbInfo.doc_count > 0){
						ds.db.allDocs({include_docs: true}).then(function(list){
							list = list.rows.map(function(item){
								return item.doc;
							})
							deferred.resolve(list)
						})
					}else{
						ds._tools.pullAll().then(function(){
							ds.db.allDocs({include_docs: true}).then(function(list){
								list = list.rows.map(function(item){
									return item.doc;
								})
								deferred.resolve(list)
							})
						})
					}
				})
				return deferred.promise;
			},
			query: function(query){
				return ds.tools.list();
			},
			get: function(objectId){
				var deferred = $q.defer();
				ds.db.find({selector: {objectId: objectId}})
				.then(function(result) {
					deferred.resolve(result.docs[0])
				}).catch(function(e) {
					deferred.reject(e)
				});
				return deferred.promise;
			},
			localGet: function(id){
				var deferred = $q.defer();
				ds.db.get(id)
				.then(function(result) {
					deferred.resolve(result)
				}).catch(function(e) {
					deferred.reject(e)
				});
				return deferred.promise;
			},
			save: function(item){
				var deferred = $q.defer();
				item.pdbState = 'savedLocally';
				if(!item._id)
					item._id = ds._tools.id();
				ds.db.put(item).then(function(r) {
					item._id = r.id;
					item._rev = r.rev;
					deferred.resolve(item);
				}).catch(function(e) {
					console.error(e);
				});
				return deferred.promise;
			},
			pointer: function(object){
				if(object.objectId)
					return {
						__type: "Pointer",
						className: ds.settings.className,
						objectId: object.objectId
					}
				else
					return {
						__type: "Pointer",
						className: ds.settings.className,
						localId: object._id
					}
			},
			delete: function(object){
				//remove object.
			}
		}
		ds.list = ds.tools.list;
		ds.delete = ds.tools.delete;
		ds.get = ds.tools.list;
		ds.save = ds.tools.save;
	}
	return Parse;
})
.factory('Triger', function(Parse){
	var Triger = function(){
		var self = this;
			self.data = {
				table: '',		// any table in db
				action: '', 	// (insert, update, delete)
				conditions: [], // {col:col, 
								// compare:('$lt,$lte,$gt,$gte',[$ne,$in,$nin],$exists,-$select,$dontSelect-,$all,$regex), 
								// value:(string, number, array)}
				actions: [] 	// {method:(call,text,email,fax,snail)
								// params: (custom by method)}
								// call: fromNumber, toNumber, message/<phoneInteraction>
								// text: fromNumber, toNumber, message
								// email: fromEmail, toEmail, subject, body(or template)
								// fax: fromNumber, toNumber, document
								// snail: fromAddress, toAddress, [document]
			}
		self.tools = {
			get: {
				options: function(){
					//return list of columns and their type.
				}
			}
		}
	}
	return Triger;
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
.factory('$routeParams', function(){
	return {
		id: 'init',
		for: 'init',
		action: 'forms'
	}
})
.controller('AdminFormsCtrl', function($scope, $http, $timeout, $routeParams, Parse) {
	var Forms = new Parse('Forms');
	var tools = $scope.tools = {
		view: function(){
			var a = $routeParams.action || 'list';
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
});
