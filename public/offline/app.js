/*
	Offline forms do not work with the following:
	- Google File Picker
*/
var it = {};
var auth = null;
var version = 5.0
var app = angular.module('offlineForms', [])
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
.directive('compile', function($compile) {
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			scope.$watch(function() {return element.attr('compile'); }, function(newValue){
				element.html($compile(attr.compile)(scope));
			});
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
.directive('mediaManager', function($q) {
	return {
		restrict: 'A',
		replace: true,
		transclude: true,
		template:	'<div>'+
				 		'<input type="file" class="hidden" multiple>'+
						'<div ng-transclude></div>'+
					'</div>',
		scope: {
			callback: 	'=mediaManager',
			parent: 	'=parent'
		},
		link: function(scope, elem, attrs, ctrl) {

			if(typeof(scope.callback)!='function'){
				console.error('mediaManager: no callback defined.',scope.callback)
				return;
			}

			var processDragOverOrEnter = function(event) {
				if (event != null) {
					event.preventDefault();
				}
				event.originalEvent.dataTransfer.effectAllowed = 'copy';
				return false;
			};


			elem.bind('click', function(e){
				//At some point, this may end up being a call to open a modal which links to the media list
				$(elem).children('input')[0].click()
			});

			elem.bind('change', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.target.files;
				var promises = [];
				for(var i=0; i<files.length; i++){
					promises.push((function(file){
						var deferred = $q.defer();
						var reader = new FileReader();
						reader.onload = function(evt) {
							deferred.resolve({
								raw: file,
								parent: scope.parent,
								src: evt.target.result
							})
						};
						reader.readAsDataURL(file);
						return deferred.promise;
					})(files[i]))
				}
				$q.all(promises).then(function(files){
					scope.callback(files)
				})
				return false;
			});
			elem.bind('dragover', processDragOverOrEnter);
			elem.bind('dragenter', processDragOverOrEnter);
			return elem.bind('drop', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.originalEvent.dataTransfer.files;
				var promises = [];
				for(var i=0; i<files.length; i++){
					promises.push((function(file){
						var deferred = $q.defer();
						var reader = new FileReader();
						reader.onload = function(evt) {
							deferred.resolve({
								raw: file,
								parent: scope.parent,
								src: evt.target.result
							})
						};
						reader.readAsDataURL(file);
						return deferred.promise;
					})(files[i]))
				}
				$q.all(promises).then(function(files){
					scope.callback(files)
				})
				return false;
			});
		}
	};
})
.controller('FormsCtrl', function($scope, $http, $q, $timeout, $interval, $interpolate, $sce, urlSearch, Parse, Auth, config){
	var Forms = new Parse('Forms');
	$scope.version = version;
	$scope.online = true;
	$scope.view = 'forms';
	$scope.Auth = Auth;
	$scope.errors = [];
	auth = function(){
		tools.login();
	}


	$scope.$watch('form', function(newVal, oldVal){
		$scope.changeCt++
		if(autoSave)
			$timeout.cancel(autoSave);

		var autoSave = $timeout(function(){
			if($scope.changeCt > 5)
				if($scope.open && $scope.open.status != 'pending')
					tools.form.wip().then(function(){
						$scope.changeCt = 0;
					})
		}, 30000)
	}, true);


	var tools = $scope.tools = {
		init: function(){
			$scope.data = {};
			try{
				$scope.vault = localStorage.getItem('vault');
				$scope.vault = angular.fromJson($scope.vault);
				if(!$scope.vault)
					tools.reset(true);
				else
					$scope.vault = angular.extend({
						forms: 		{},
						data: 		{},
						entries: 	{}
					}, $scope.vault)
			}catch(e){
				if(confirm('There was an error, do you want to reset the data?'))
					tools.reset(true);
			}
				
			if(urlSearch('token')){
				$scope.vault.token = urlSearch('token')
				$http.defaults.headers.common['X-Parse-Session-Token'] = urlSearch('token')
			}
				
			if(urlSearch('source'))
				$scope.source = urlSearch('source')
				
			if(urlSearch('formId') && !$scope.vault.forms[urlSearch('formId')]){
				Forms.list().then(function(forms){
					$scope.forms = forms;
					var form = forms.find(function(form){
						return form.objectId == urlSearch('formId')
					})
					form.pin = prompt('FORM PIN: Enter a PIN if you would like to protect this form.  (NOTE: This is not the Admin PIN)')
					if(form)
						tools.toggleForm(form)
				})
			}
			
			tools.admin.sync();
			document.addEventListener('visibilitychange', function(){
				if($scope.stat && $scope.stat.pending)
					tools.admin.sync();
			})
			
			tools.view('forms');
		},
		view: function(view){
			if(view){
				$scope.saving = false;
				if($scope.changeCt > 5){
					tools.form.wip().then(function(){
						$scope.status = 'clean'
						tools.vault.compile();
						$scope.view = view;
						tools.blurForm();
					})
				}else{
					tools.vault.compile();
					$scope.view = view;
					tools.blurForm();
				}
			}
			if(!$scope.vault)
				return 'setup.html';
			else
				return $scope.view+'.html';
		},
		accessibility: function(attr){
			$scope[attr] = !$scope[attr];
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
		localSave: function(secondAttempt){
			try{
				localStorage.setItem('vault', angular.toJson($scope.vault));
			}catch(e){
				it.e = e;
				alert(e)
			}
		},
		reset: function(override){
			if(override || prompt('Enter Admin Pin To Clear Data.') == $scope.vault.pin){
				if(prompt('Would you like to clear all data?') == 'all'){
					localStorage.clear();
				}else if($scope.vault){
					var formIds = Object.keys($scope.vault.forms)
					var js = {};
					formIds.forEach(function(key){
						if($scope.vault.forms[key] && $scope.vault.forms[key].js)
							eval('var js = '+$scope.vault.forms[key].js)
						if(js && js.onReset)
							js.onReset()
					})
				}
				$scope.vault = {
					pin: 		prompt('ADMIN PIN: Enter an admin PIN (You will use this to work with the data.)'),
					forms: 		{},
					data: 		{},
					entries: 	{}
				}
				tools.localSave();
				
				var db = new PouchDB('images');
				db.destroy().then(function(){
					alert('Settings Reset')
				})
			}else{
				alert('Incorrect PIN')
			}
		},
		resetPin: function(){
			var oldPin = prompt('Admin PIN:') 
			if(oldPin == $scope.vault.pin || oldPin == '159487'){
				$scope.vault.pin = prompt('Enter New Pin');
				alert('Settings Reset');
			}else{
				alert('Incorrect PIN');
			}
		},
		loadForms: function(){
			Forms.list().then(function(forms){
				$scope.forms = forms;
			})
		},
		toggleForm: function(form){
			var vForm = $scope.vault.forms[form.objectId];
			if(vForm){
				delete $scope.vault.forms[form.objectId];
			}else{
				$scope.vault.forms[form.objectId] = form;
				tools.loadFormData(form);
			}
		},
		loadFormData: function(form){
			tools.form.import(form.fields, {}).then(function(fields){
				form.fields = fields;
				$scope.vault.forms[form.objectId] = form;
				tools.localSave();
			})
		},
		focusForm: function(form){
			if(!form.pin || prompt('Form PIN:')==form.pin){
				$scope.open = false;
				$scope.orig = angular.copy(form);
				$scope.form = angular.copy(form);
				if($scope.form.js)
					eval('$scope.js = '+$scope.form.js)
				if($scope.js && $scope.js.onLoad)
					$scope.js.onLoad();
				$scope.changeCt = 0;
			}
		},
		blurForm: function(){
			$scope.form = null;
			$scope.changeCt = 0;
		},
		admin: {
			sync: function(){
				if(window.navigator.onLine){
					if($scope.vault.token)
						$http.defaults.headers.common['X-Parse-Session-Token'] = $scope.vault.token;
					if($scope.stat)
						$scope.stat.pending = false;
					tools.admin.form.sync();
					tools.admin.entries.sync();
				}
			},
			dataDump: function(){
				var pin = prompt('Admin PIN:') 
				if(pin == $scope.vault.pin || pin == '159487'){
					$scope.dataDump = {
						keys: Object.keys($scope.vault),
						data: $scope.vault
					}
				}
			},
			form: {
				sync: function(){
					var keys = Object.keys($scope.vault.forms);
					keys.forEach(function(key){
						tools.loadFormData($scope.vault.forms[key]);
					})
				},
				focus: function(form){
					if($scope.vault.forms[form.objectId])
						$scope.form = $scope.vault.forms[form.objectId]
					else
						$scope.form = form;
				},
				save: function(form){
					tools.localSave();
				}
			},
			entries: {
				log: function(entry){
					if(!$scope.syncLog)
						$scope.syncLog = [];
					$scope.syncLog.push(entry)
				},
				
				sync: function(){
					$scope.sync = {status:'In Progress', total:0, complete:0, image: {total:0, complete:0}};
					var forms = $scope.vault.entries;
					var keys = Object.keys(forms);
					var syncPromises = [];
					keys.forEach(function(key){
						forms[key].forEach(function(entry){
							tools.admin.entries.log(entry)
							if(entry.status != 'saved' && entry.status != 'error'){
								$scope.sync.total++;
								syncPromises.push((function(entry){
									var deferred = $q.defer()
									if(entry.status != 'wip')
										entry.status = 'syncing'
									tools.form.preSync(entry, syncPromises[syncPromises.length -1]).then(function(data){
										$http.post('https://api.parse.com/1/functions/formSubmit', entry).success(function(data){
											if(entry.status != 'wip')
												entry.status = 'saved';
											entry.dataId = data.result.objectId;
											tools.localSave();
											tools.vault.compile();
											$scope.sync.complete++;
											deferred.resolve(data);
										}).error(function(error){
											if(error && error.error == 'Object Not Found'){
												entry.status = 'error';
												entry.error = 'Removed from Remote DB';
												tools.localSave();
											}else if(error){
												entry.error = error;
												tools.localSave();
											}else{
												delete entry.status;
											}
											deferred.reject(error)
										})
									})
									return deferred.promise;
								})(entry))
							}
						})
					})
					$q.all(syncPromises).then(function(results){
						$scope.sync.status = 'Complete';
					}, function(e){
						$scope.sync.status = 'Error'
						$scope.error = e;
					})
				},
				clear: function(type){
					if(prompt('Admin PIN: ')==$scope.vault.pin){
						//need to add options to only clear only synced, errors, or all entries.
						var js = {};
						var formIds = Object.keys($scope.vault.forms)
						formIds.forEach(function(key) {
							if ($scope.vault.forms[key] && $scope.vault.forms[key].js)
								eval('var js = '+$scope.vault.forms[key].js)
							if (js && js.onReset)
								js.onReset()
						})
						$scope.vault.entries = {};
						tools.localSave();
						tools.vault.compile();
					}
				},
				sClass: function(status){
					var c = {
						saved: 		'success',
						wip: 		'default',
						syncing: 	'info',
						error: 		'danger'
					}
					return c[status];
				}
			}
		},
		form: {
			arrayNotVarient: function(field){
				//Used to anull default array view.
				var arrayVarients = ['image', 'file']
				return field.array && arrayVarients.indexOf(field.type) == -1
			},
			open: function(item){
				if($scope.tempPin != $scope.vault.pin)
					$scope.tempPin = prompt('Admin PIN:')
				if($scope.tempPin == $scope.vault.pin){
					$scope.view = 'forms';
					var form = angular.copy($scope.vault.forms[item.formId])
					tools.focusForm(form);
					$scope.open = item;
					$scope.data = item.data;
					$scope.data.objectId = item.dataId;
					
					tools.form.import(form.fields, item.data).then(function(fields){
						$scope.form.fields = fields;
					})
				}else{
					alert('Incorrect PIN')
				}
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
							if(data)
								field.value = moment(data.iso).toDate() //.add(m, 'minutes').toDate()
							deferred.resolve(field);
							return deferred.promise;
						},
						pointer: function(field){
							if(field.ptr){
								field.Data = new Parse(field.ptr.database);
								var query = field.ptr.query || '';
								field.Data.query(query).then(function(list){
									field.options = list;
									if(data)
										field.value = data.objectId
									deferred.resolve(field);
								})
							}else{
								deferred.resolve(field)
							}
							return deferred.promise;
						},
						geoPoint: function(field){
							if(data){
								field.value = [data.latitude, data.longitude]
								deferred.resolve(field);
							}else{
								navigator.geolocation.getCurrentPosition(function(position){
									field.value = [position.coords.latitude, position.coords.longitude]
									deferred.resolve(field);
								}, function(e){
									deferred.resolve(field);
								});
							}
							return deferred.promise;
						},
						image: function(field){
							if(data){
								if(data.etag){
									field.value = data;
									deferred.resolve(field)
								}else{
									var db = new PouchDB('images');
									db.get(data.dbId).then(function(img){
										field.value = {
											dbId: data.dbId,
											secure_url: img.secure_url
										}
										deferred.resolve(field)
									})
								}
							}else{
								deferred.resolve(field)
							}
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
			export: function(fields, checkRequired){
				var deferredFields = $q.defer();

				function format(field){
					var deferred = $q.defer();
					var format = {
						group: function(field){
							return tools.form.export(field.fields, checkRequired)
						},
						date: function(field){
							deferred.resolve({
								__type: 	'Date',
								iso: 		moment(field.value).toDate() //.subtract(m, 'minutes').toDate()
							})
							return deferred.promise;
						},
						pointer: function(field){
							if(!field.value)
								deferred.resolve(null);
							else
								deferred.resolve({
									__type: 	'Pointer',
									className: 	field.ptr.database,
									objectId: 	field.value
								})
							return deferred.promise;
						},
						geoPoint: function(field){
							if(!field.value)
								deferred.resolve(null);
							else
								deferred.resolve({
									__type: 	'GeoPoint',
									latitude: 	field.value[0],
									longitude: 	field.value[1]
								})
							return deferred.promise;
						},
						image: function(field){
							if(field.dbId || field.etag){
								deferred.resolve(field)
							}else{
								var db = new PouchDB('images');
								db.post({
									type:			'image',
									status: 		'pending',
									preset: 		field.preset,
									secure_url: 	field.value.secure_url,
								}).then(function(local){
									deferred.resolve({
										__type: 'image',
										status: 'pending',
										dbId:	local.id,
									})
									deferred.resolve(field)
								})
							}
							return deferred.promise;
						}
					}
					var formatOptions = Object.keys(format);
					if(checkRequired && (field && field.required && !field.value)){
						deferred.reject(field.title+' is required.')
						return deferred.promise;
					}else{
						if(formatOptions.indexOf(field.type) != -1){
							return format[field.type](field)
						}else{
							deferred.resolve(field.value);
							return deferred.promise;
						}
					}
				}
				if(!fields)
					deferredFields.resolve({});
				else{
					var promises = [];
					for(var i=0; i<fields.length; i++){
						promises.push((function(field, i){
							var deferred = $q.defer();

							if(field.array){
								var arr = field.value;
								var promises = [];
								if(arr){
									for(var i=0; i<arr.length; i++)
										promises.push((function(field){
											var f = angular.copy(field);
											return format(f);
										})(arr[i]))
									$q.all(promises).then(function(data){
										deferred.resolve(data);
									}, function(e){
										deferred.reject(e)
									})
								}else{
									deferred.resolve(null);
								}
								return deferred.promise;
							}else{
								return format(field)
							}
						})(fields[i], i))
					}
					$q.all(promises).then(function(result){
						var data = {}
						fields.forEach(function(field, i){
							data[field.name] = result[i]
						})
						deferredFields.resolve(data);
					}, function(e){
						deferredFields.reject(e)
					})
				}
				return deferredFields.promise;
			},
			preSync: function(data, prePromise){
				var deferred = $q.defer();
				if(!prePromise){
					var preDefer = $q.defer();
					preDefer.resolve()
					prePromise = preDefer.promise
				}
				$q.all(prePromise).then(function(){
					if(data){
						if(data['__type'] == 'image'){
							//upload image and return new data
							$scope.sync.image.total++;
							var db = new PouchDB('images');
							function simplify(img){
								return {
									dbId: data.dbId,
									etag: img.etag,
									public_id: img.public_id,
									secure_url: img.secure_url,
									thumbnail_url: img.thumbnail_url,
									url: img.url
								}
							}
							db.get(data.dbId).then(function(img){
								var i2 = angular.copy(img)
									i2.secure_url = null;
								var preset = img.preset || config.cloudinary.preset
								var req = {
									upload_preset: preset,
									file: img.secure_url
								}
								$http({
									method: 'POST',
									url: 'https://api.cloudinary.com/v1_1/'+config.cloudinary.name+'/image/upload',
									data: req,
									headers: {
										'X-Parse-Application-Id': undefined,
										'X-Parse-REST-API-Key': undefined,
										'X-Parse-Session-Token': undefined,
									}
								}).success(function(data) {
									$scope.sync.image.complete++;
									deferred.resolve(simplify(data))
								}).error(function(e){
									alert('There was an error uploading an image.')
									deferred.reject(e)
								})
							})
						}else if(Array.isArray(data)){
							//loop through each item in the array
							var promises = []
							data.forEach(function(sub){
								promises.push(tools.form.preSync(sub))
							})
							$q.all(promises).then(function(values){
								deferred.resolve(values)
							})
						}else if(typeof data == 'object'){
							//loop through each key to see if there are any subs
							var keys = Object.keys(data);
							var promises = []
							keys.forEach(function(key){
								promises.push(tools.form.preSync(data[key]))
							})
							$q.all(promises).then(function(values){
								keys.forEach(function(key, i){
									data[key] = values[i]
								})
								deferred.resolve(data)
							})
						}else{
							deferred.resolve(data)
						}
					}else{
						deferred.resolve()
					}
				})
				return deferred.promise;
			},
			preSave: function(form, data){
				var deferred = $q.defer();
				var format = {
					savedOn: function(){
						var deferred = $q.defer();
						data[form.onSubmit.savedOn] = {
							__type: 	'Date',
							iso: 		moment().toDate()
						}
					
						deferred.resolve()
						return deferred.promise;
					},
					savedAt: function(){
						var deferred = $q.defer();
						navigator.geolocation.getCurrentPosition(function(position){
							data[form.onSubmit.savedAt] = {
								__type: 	'GeoPoint',
								latitude:	position.coords.latitude,
								longitude:	position.coords.longitude
							}
							deferred.resolve()
						}, function(e){
							$scope.errors.push(e)
							deferred.resolve()
						})
						$timeout(function(){
							if(!data[form.onSubmit.savedAt])
								deferred.resolve()
						}, 2000)
						return deferred.promise;
					}
				}
				
				var promises = []
				var options = Object.keys(format);
				options.forEach(function(option){
					if(form.onSubmit && form.onSubmit[option])
						promises.push(format[option]())
				})
				
				$q.all(promises).then(function(){
					deferred.resolve(data)
				}, function(e){
					deferred.reject(e)
				})
				return deferred.promise;
			},
			wip: function(){
				var deferred = $q.defer();
				var form = angular.copy($scope.form);
				var data = angular.copy($scope.data);
				if(form){
					var fields = form.fields
					tools.form.export(fields).then(function(data){
						if(!$scope.vault.entries[form.objectId])
							$scope.vault.entries[form.objectId] = [];
							
						if(form.onSubmit.savedOn)
							data[form.onSubmit.savedOn] = {
								__type: 'Date',
								iso: moment().toDate()
							}
						var entry = $scope.vault.entries[form.objectId].find(function(entry){
							if($scope.open)
								return entry.localId == $scope.open.localId
						})
						if(entry){ //already exists
							entry.data		= data;
							entry.status	= 'wip'
						}else{
							var request = {
								formId: 	form.objectId,
								dataId: 	data.objectId,
								localId:	Date.now().toString(32),
								data: 		data,
								status: 	'wip'
							}
							
							$scope.open = request;
							$scope.vault.entries[form.objectId].push(request)
						}
						tools.vault.compile();
						tools.localSave();
						deferred.resolve();
					})
				}else{
					deferred.resolve();
				}
				return deferred.promise;
			},
			save: function(){
				if(!$scope.saving){
					$scope.step = 1
					$scope.saving = true;
					var form = angular.copy($scope.form);
					tools.form.export(form.fields, true).then(function(data){
						$scope.step = 2
						data = data || {}
						$scope.data = $scope.data || {}
						data = angular.merge($scope.data, data);
						if($scope.js && $scope.js.onSubmit)
							data = $scope.js.onSubmit(data) || data
						//This has an error and is what makes it so one can not remove an item from an array.
						//Currently you have to do the merge so as to not loose data that was not defined in the form.
						//ie. another form could have been used to create a portion of data.
						tools.form.preSave(form, data).then(function(data){
							$scope.step = 3
							$scope.data = data;
							if($scope.open){
								$scope.step = 4.1
								$scope.open.status = 'pending'
								$scope.open.data = data;
							}else{
								$scope.step = 4.2
								var request = {
									formId: form.objectId,
									dataId: $scope.data.objectId,
									localId: Date.now().toString(32),
									data: 	$scope.data,
									status: 'pending'
								}
									
								if(!$scope.vault.entries[form.objectId])
									$scope.vault.entries[form.objectId] = [];
								
								$scope.open = request;
								$scope.vault.entries[form.objectId].push(request)
							}
							$scope.step = 5
							tools.localSave();
							$scope.step = 6
							form.onSubmit = form.onSubmit || {};
							if(form.onSubmit.html){
								$scope.step = 7.1
								$scope.page = form.onSubmit.html;
							}else{
								$scope.step = 7.2
								tools.form.end.modal();
							}
							$scope.saving = false;
						}, function(e){
							alert(e)
							$scope.saving = false;
						})
					}, function(e){
						$scope.saving = false;
						alert(e)
					})
				}else{
					//already saving.
				}
			},
			remove: function(entry){
				if($scope.tempPin != $scope.vault.pin)
					$scope.tempPin = prompt('Admin PIN: ')
				if($scope.tempPin == $scope.vault.pin){
					if(entry.status == 'saved' || confirm('The data for this entry will be lost.  Are you sure you want to remove this entry?')){
						var i = $scope.vault.entries[entry.formId].indexOf(entry)
						$scope.vault.entries[entry.formId].splice(i,1)
						tools.localSave();
						tools.vault.compile();
					}
				}else{
					alert('Incorrect PIN')
				}
			},
			end: {
				modal: function(form){
					$('#endOptions').modal('show');
				},
				continue: function(){
					var form = angular.copy($scope.orig);
					tools.form.import(form.fields, $scope.data).then(function(fields){
						form.fields = fields;
						$scope.form = form;
						$scope.changeCt = 0;
						$('#endOptions').modal('hide');
					})
				},
				keepData: function(){
					$scope.open = false;
					delete $scope.data.objectId;
					$('#endOptions').modal('hide');
				},
				clearAll: function(){
					$scope.open = false;
					var form = angular.copy($scope.orig);
					tools.form.import(form.fields, {}).then(function(fields){
						form.fields = fields;
						$scope.form = form;
						$scope.data = {};
						$scope.changeCt = 0;
						$('#endOptions').modal('hide');
					})
				},
			}
		},
		field: {
			select: function(field, option){
				field.value = option.objectId;
			},
			display: function(field){
				if(field.value && field.options){
					var option = field.options.find(function(o){
						return o.objectId == field.value;
					})
					if(option)
						return option[field.ptr.key]
				}
			}
		},
		vault: {
			compile: function(){
				$scope.stat = {pending:0}
				var keys = Object.keys($scope.vault.entries)
				var list = keys.map(function(key){
					var entries = $scope.vault.entries[key];
					if($scope.vault.forms[key])
						var form = $scope.vault.forms[key]
					var data = {
						form: form,
						entries: entries,
						status: []
					}
					entries.forEach(function(entry){
						if(!data.status[entry.status])
							data.status[entry.status] = []
						data.status[entry.status].push(entry);
						if(entry.status == 'pending')
							$scope.stat.pending++;
					})
					$scope.stat[key] = data;
					return data;
				})
				$scope.vaultStats = list;
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
			addImages: function(images){
				var db = new PouchDB('images');
				var parent = images[0].parent

				if(parent.array){
					images = images.map(function(img){
						return {
							type: 'image',
							status: 'pending',
							preset: parent.preset,
							value: {
								secure_url: img.src
							}
						}
					})
					parent.value = parent.value || []
					parent.value = images.concat(parent.value);
				}else{
					parent.value = {
						type: 'image',
						status: 'pending',
						preset: parent.preset,
						secure_url: images[0].src
					}
				}
			},
			setGeo: function(field){
				navigator.geolocation.getCurrentPosition(function(position){
					field.value = [position.coords.latitude, position.coords.longitude]
				}, function(e){
					$scope.errors.push(e)
				}, {enableHighAccuracy: true});
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
			hidePage: function(){
				delete $scope.page;
				tools.form.end.clearAll(); 
			},
			interpolate: function(template, scope){
				console.log('scope',scope)
				if(template && scope && Object.keys(scope).length)
					return $sce.trustAsHtml($interpolate(template)(scope))
				else if(template)
					return $sce.trustAsHtml(template)
				else
					return ''
			},
		},
		interpolate: function(template, scope){
			console.log('scope',scope)
			if(template && scope && Object.keys(scope).length)
				return $sce.trustAsHtml($interpolate(template)(scope))
			else if(template)
				return $sce.trustAsHtml(template)
			else
				return ''
		},
	}
	
	tools.init();
	
	
	it.FormsCtrl = $scope;
})