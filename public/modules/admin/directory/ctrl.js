app.lazy.controller('WorkDirectoryCtrl', function($rootScope, $scope, $q, $http, config, Parse, Auth){
	var Directory = new Parse('Directory', true);
	var temp = $scope.temp = {};
	
	var tools = $scope.tools = {
		init: function(){
			tools.sync.init();
		},
		google: {
			request: function(req, params){
				var deferred = $q.defer();
				// var userDomain = $rootScope.user.profile.domain; //GEt the domain to load settings.
				var params = angular.extend({domain: config.appsDomain}, params)
				var request = gapi.client.directory[req].list(params);
				request.execute(function(data) {
					deferred.resolve(data);
				});
				return deferred.promise;
			},
			groups: {
				load: function(){
					var deferred = $q.defer();
					function gm(group){
						var deferred = $q.defer();
						var request = gapi.client.directory.members.list({
							domain: config.appsDomain,
							groupKey: group.id
						});
						
						request.execute(function(data) {
							deferred.resolve(data.members);
						});
						return deferred.promise;
					}
					var groups = tools.google.request('groups');
					groups.then(function(data){
						var promises = data.groups.map(function(group){
							return gm(group)
						})
						$q.all(promises).then(function(results){
							data.groups = data.groups.map(function(group, i){
								group.members = results[i];
								return group;
							})
							deferred.resolve(data.groups)
						})
					})
					return deferred.promise;
				},
				add: function(){
					
				},
				upsert: function(){
					
				},
				remove: function(){
					
				}
			},
			directory: {
				load: function(){
					var deferred = $q.defer();
					var users = tools.google.request('users');
					users.then(function(data){
						deferred.resolve(data.users)
					})
					return deferred.promise;
				},
				add: function(){
					alert('Coming Soon')
				},
				upsert: function(){
					alert('Coming Soon')
				},
				remove: function(){
					alert('Coming Soon')
				}
			}
		},
		local: {
			roles: {
				load: function(){
					
				},
				add: function(){
					
				},
				upsert: function(){
					
				},
				remove: function(){
					
				}
			},
			directory: {
				load: function(){
					return Directory.query('?limit=1000')
				},
				add: function(gUser){
					var lUser = {
						email:			gUser.primaryEmail,
						externalIds:	gUser.externalIds,
						googleId:		gUser.id,
						name:			gUser.name.fullName,
						orgs:			gUser.organizations,
						phones: 		gUser.phones,
						thumbnail:		gUser.thumbnailPhotoUrl
					}
					tools.local.directory.upsert(lUser).then(function(r){
						lUser = angular.extend(lUser, r)
						$scope.data.localDir.push(lUser)
						tools.sync.compile($scope.data).then(function(data){
							$scope.data = data;
						})
					})
				},
				upsert: function(user){
					var deferred = $q.defer();
					Directory.save(user).then(function(result){
						toastr.success('Directory Updated')
						deferred.resolve(result)
					}, function(e){
						toastr.error(e)
						deferred.reject(e)
					})
					return deferred.promise;
				},
				remove: function(user){
					var deferred = $q.defer();
					if(confirm('Are you sure you want to remove this Directory Entry?')){
						Directory.delete(user).then(function(result){
							var i = $scope.data.localDir.indexOf(user);
							$scope.data.localDir.splice(i,1)
							toastr.success('User Removed From Directory')
							deferred.resolve(result)
						}, function(e){
							toastr.error(e)
							deferred.reject(e)
						})
					}
					return deferred.promise;
				}
			}
		},
		sync: {
			init: function(){
				tools.sync.load().then(function(data){
					tools.sync.compile(data).then(function(data){
						$scope.data = data;
					})
				})
			},
			request: function(){
				var scopes = [
					'https://www.googleapis.com/auth/admin.directory.user',
					'https://www.googleapis.com/auth/admin.directory.orgunit',
					'https://www.googleapis.com/auth/admin.directory.user.readonly',
					'https://www.googleapis.com/auth/admin.directory.group.readonly',
				];
				
				Auth.tools.google.scopes(scopes).then(function(result){
					temp.syncDefer.resolve();
				})
			},
			load: function(){
				var deferred = $q.defer();
				function loadAll(){
					gapi.client.load('admin', 'directory_v1', function(){
						$q.all([
							tools.google.directory.load(),
							tools.local.directory.load()
						]).then(function(result){
							var data = {
								googleDir: result[0],
								localDir: result[1]
							}
							deferred.resolve(data)
						})
					});
				}
				
				Auth.init().then(function(user){
					if(user.gAuth.scope.indexOf('https://www.googleapis.com/auth/admin.directory.orgunit') != -1){
						loadAll();
					}else{
						$scope.requestAccess = true;
						temp.syncDefer = $q.defer();
						var syncPromise = temp.syncDefer.promise;
						
						syncPromise().then(function(){
							$scope.requestAccess = false;
							loadAll();
						})
					}
				})
				return deferred.promise;
			},
			compile: function(data){
				var deferred = $q.defer();
				if(data.googleDir){
					var googleShort = data.googleDir.map(function(g){
						return g.name.fullName
					})
					var localShort = data.localDir.map(function(l){
						return l.name
					})
					
					var notInGoogle = data.localDir.filter(function(local){
						return googleShort.indexOf(local.name) == -1;
					})
					var notInLocal = data.googleDir.filter(function(google){
						return localShort.indexOf(google.name.fullName) == -1;
					})
					data.notInGoogle = notInGoogle;
					data.notInLocal = notInLocal;
				}
					deferred.resolve(data)
				return deferred.promise;
			},
			fromLocal: function(){
				var users  = angular.copy($scope.data.localDir);
				function manage(users){
					var user = users.pop()
					delete user.objectId;
					delete user.createdAt;
					delete user.updatedAt;
					tools.local.directory.upsert(user).then(function(r){
						toastr.success('User Added: '+user.name)
						if(users.length > 0 )
							manage(users)
					})
				}
				manage(users)
			},
			removeDups: function(){
				var emails = $scope.data.localDir.map(function(u){return u.email})
					emails = (function(arr){
					var a = [],
						b = [],
						prev;
					arr.sort();
					for (var i = 0; i < arr.length; i++) {
						if (arr[i] !== prev) {
							a.push(arr[i]);
							b.push(1);
						}
						else {
							b[b.length - 1]++;
						}
						prev = arr[i];
					}
				
					return a.filter(function(e,i){return b[i] > 1})
				})(emails)
				emails.forEach(function(email){
					var user = $scope.data.localDir.find(function(o){return o.email == email})
					tools.local.directory.remove(user)
				})
				return emails;
			}
		},
		user: {
			new: function(user){
				$scope.udEmails.splice($scope.udEmails.indexOf(user), 1);
				user.account = user.account+'@'+config.appsDomain;
				if(!user.firstname){
					user.firstname = user.name.split(' ')[0]
					user.lastname = user.name.split(' ')[1]
				}
				var insert = gapi.client.directory.users.insert;
				var data = {
					"domain":		config.appsDomain,
					"primaryEmail": user.account,
					"name": {
						"givenName": user.firstname,
						"familyName": user.lastname
					},
					"suspended": false,
					"password": 'changeme',
					// "hashFunction": "SHA-1",
					"changePasswordAtNextLogin": true,
					"ipWhitelisted": false,
					"emails": [{
						"address": user.account,
						"type": "work",
						"customType": "",
						"primary": true
					}],
					"addresses": [{
						"type": "work",
						"customType": "",
						"streetAddress": "505 D. St",
						"locality": "Hurley",
						"region": "NM",
						"postalCode": "88043"
					}],
					"externalIds": [{
						"value": user.employeeid,
						"type": "custom",
						"customType": "employee"
					}],
					"relations": [],
					"organizations": [{
						"name": "Easy Business Center.",
						"title": user.title,
						"primary": true,
						"type": "work",
						"description": user.description
					}],
					"phones": [],
					"orgUnitPath": "",
					"includeInGlobalAddressList": true
				}
				if(user.workphone)
					data.phones.push({
						"value": user.workphone,
						"type": "work"
					})
				if(user.cellphone)
					data.phones.push({
						"value": user.cellphone,
						"type": "mobile"
					})
					
					
				insert(data).then(function(r){
					console.log(r);
					it.r = r;
				})
			}
		}
	}
	
	it.WorkDirectoryCtrl = $scope;
});