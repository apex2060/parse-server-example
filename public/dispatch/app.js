/*
	Offline forms do not work with the following:
	- File Input
	- Image Input
*/
var it = {};
var app = angular.module('dispatch', [])
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
.factory('Parse', function($http, $q, $timeout, config, Auth){
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
	
	//Pull all from parse
		//Save locally
	//On Remote Change
		//Update local version
	//On Local Change
		//Save locally
		//Attempt Sync
	//Sync
		//Check pointers
		//Save to remote
		//Update local version with object id
		
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
						console.log('No OBject Id',object)
						ds._parse.new(o2).then(function(obj){
							object.objectId = obj.objectId;
							object.createdAt = obj.createdAt;
							object.pdbState = 'syncSuccess';
							ds.db.put(object).then(function(r) {
								object._id = r.id;
								object._rev = r.rev;
								deferred.resolve(object);
							}).catch(function(e) {
								console.error(e);
							});
							deferred.resolve(obj);
						})
					}else{
						console.log('Updating existing object',object)
						ds._parse.update(o2).then(function(obj){
							object.updatedAt = object.updatedAt;
							object.pdbState = 'syncSuccess';
							ds.db.put(object).then(function(r) {
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
				ds.db.createIndex({index: {fields: ['pdbState']}}).then(function(){
					ds.db.find({selector:{pdbState:'savedLocally'}})
					.then(function(syncList) {
						syncList.docs.forEach(function(item){
							ds._parse.save(item);
						})
					}).catch(function(e) {
						deferred.reject(e);
					});
				})
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
				ds.db.createIndex({index: {fields: ['objectId']}}).then(function(){
					ds.db.find({selector: {objectId: objectId}})
					.then(function(result) {
						deferred.resolve(result.docs[0])
					}).catch(function(e) {
						deferred.reject(e)
					});
				})
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
					ds._tools.sync();
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
		//Direct Objects
		ds.list = ds.tools.list;
		ds.delete = ds.tools.delete;
		ds.get = ds.tools.list;
		ds.save = ds.tools.save;
	}
	return Parse;
})
.factory('Random', function($sce, $interpolate){
	return {
		interpolate: function(template, scope){
			if(template && scope && Object.keys(scope).length)
				return $sce.trustAsHtml($interpolate(template)(scope))
			else if(template)
				return $sce.trustAsHtml(template)
			else
				return ''
		}
	}
})
.directive('signature', function($timeout){
	return {
		restrict: 'E',
		replace: true,
		template:	'<div style="position:relative;">'+
						'<div class="signature"><span>Sign On Line</span> | <a ng-click="signature.clear()">Clear Signature</a></div>'+
					 	''+
					'</div>',
		require: "ngModel",
		link: function(scope, ele, attrs,  ngModel){
			var signature = {};
			var sig = ele.children()[0];
			function waitToRender(sig){
				if(sig.offsetParent !== null)
					$(sig).jSignature();
				else
					$timeout(function(){
						waitToRender(sig);
					}, 1000)
			}
			waitToRender(sig);
			ngModel.$render = function() {
				return scope.signature.load(ngModel.$viewValue);
			};
			$(sig).bind('change', function(e){
				/* 'e.target' will refer to div with "#signature" */ 
				var datapair = $(sig).jSignature("getData", "svgbase64") 
				var src = "data:" + datapair[0] + "," + datapair[1]
					datapair = $(sig).jSignature("getData","base30") 
				
				signature = {
					type: 		'signature',
					date: 		new Date(),
					src: 		src,
					datapair: 	datapair,
				};
				ngModel.$setViewValue(signature);
			})
			scope.signature = {
				load: function(signature){
					if(signature)
						$(sig).jSignature("setData", "data:" + signature.datapair.join(",")) 
				},
				clear: function(){
					$(sig).jSignature("reset");
					signature = {};
					ngModel.$setViewValue(signature);
				},
			}
		}
	}
})
.controller('DispatchCtrl', function($scope, $http, $q, $timeout, Parse, Auth, config){
	var localVault = 'vehicleVault'
	var GeoLocTest = it.g = new Parse('GeoLocTest');
	$scope.online = true;
	$scope.view = 'main';
	$scope.Auth = Auth;
	$scope.steps = ['Load Truck','Leave Plant','Arrive At Job Site','Start Discharge','Finish Discharge','Leave job Site','Arrive At Plant']
	var tools = $scope.tools = {
		init: function(){
			$scope.data = {};
			$scope.vault = localStorage.getItem(localVault);
			if($scope.vault)
				$scope.vault = angular.fromJson($scope.vault)
			else
				tools.reset(true);
			if($scope.vault.token)
				$http.defaults.headers.common['X-Parse-Session-Token'] = $scope.vault.token;
			tools.location.init();
			tools.log.init();
		},
		view: function(view){
			if(view){
				$scope.view = view;
				tools.blurForm();
			}
			if(!$scope.vault)
				return 'setup.html';
			else
				return $scope.view+'.html';
		},
		login: function(choose){
			if(gapi)
				if(choose)
					Auth.tools.switchUser().then(function(user){
						$scope.user = user;
						$scope.vault.token = user.pAuth.token;
						tools.localSave();
						tools.loadForms();
					})
				else
					Auth.init().then(function(user){
						$scope.user = user;
						$scope.vault.token = user.pAuth.token;
						tools.localSave();
						tools.loadForms();
					})
		},
		localSave: function(){
			localStorage.setItem(localVault, angular.toJson($scope.vault));
		},
		reset: function(override){
			if(override || prompt('Enter Admin Pin To Clear Data.') == $scope.vault.pin){
				$scope.vault = {
					pin: 		'159487',
					forms: 		{},
					data: 		{},
					entries: 	{}
				}
				tools.localSave();
				alert('Settings Reset')
			}else{
				alert('Incorrect PIN')
			}
		},
		resetPin: function(){
			if(prompt('Enter Old Pin.') == $scope.vault.pin){
				$scope.vault.pin = prompt('Enter New Pin');
				alert('Settings Reset');
			}else{
				alert('Incorrect PIN');
			}
		},
		location: {
			init: function(){
				tools.location.timer()
				tools.location.dbTimer()
			},
			timer: function(){
				tools.location.get().then(function(p){
					$scope.position = p;
				})
				$timeout(function(){
					tools.location.timer();
				}, 10000)
			},
			dbTimer: function(){
				tools.location.get().then(function(p){
					console.log(p)
					GeoLocTest.tools.save(p)
				})
				$timeout(function(){
					tools.location.dbTimer();
				}, 1000 * 60)
			},
			get: function(){
				var deferred = $q.defer();
				if (navigator.geolocation) {
					navigator.geolocation.getCurrentPosition(function(p){
						var position = {
							timestamp: 	p.timestamp,
							accuracy: 	p.coords.accuracy,
							altitude: 	p.coords.altitude,
							headding: 	p.coords.headding,
							latitude: 	p.coords.latitude,
							longitude: 	p.coords.longitude,
							speed: 		p.coords.speed
						}
						deferred.resolve(position);
					});
				}
				else {
					deferred.reject('Geolocation is not supported.')
				}
				return deferred.promise;
			}
		},
		log: {
			//Create a log for every trip.
			//Use state options to progress through individual trip log
			//Use event options to display events (Accident, )
			init: function(){
				tools.log.new();
			},
			new: function(){
				//Load ticket
				$scope.log = {events: []}
				$scope.currentStep = $scope.steps[0]
			},
			step: function(){
				var i = $scope.steps.indexOf($scope.currentStep)
				if(i<$scope.steps.length-1){
					$scope.log.events.push({
						title: $scope.currentStep,
						timestamp: new Date().getTime()
					})
					$scope.currentStep = $scope.steps[i+1]
				}else
					tools.log.new();
			}
		}
	}
	
	tools.init();
	it.DispatchCtrl = $scope;
})