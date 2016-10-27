app.lazy.controller('AdminRoles', function($rootScope, $scope, $routeParams, $http, $q, config, Parse, Auth){
	$scope.temp = {};
	var Users = new Parse('users', true, config.parse.root);
	var Roles = new Parse('roles', true, config.parse.root);

	var tools = $scope.tools = {
		pointer: {
			role: function(roleId){
				return {
					__type: "Pointer",
					className: "_Role",
					objectId: roleId
				}
			},
			user: function(userId){
				return {
					__type: "Pointer",
					className: "_User",
					objectId: userId
				}
			}
		},
		init: function(){
			Roles.query('?limit=1000').then(function(roles){
				$scope.roles = roles;
			})
			Users.query('?limit=1000').then(function(users){
				$scope.users = users;
			})
		},
		roles: {
			mine: function(name){
				Auth.tools.init().then(function(user){
					tools.createRole(name, null, [user.pAuth.user.objectId])
				})
			},
			create: function(name, roleArr, userArr){
				if(!roleArr && $scope.roles.length)
					roleArr = [];
				for(var i=0; i<$scope.roles.length; i++)
					if($scope.roles[i].name == 'Admin')
						roleArr.push($scope.roles[i].objectId);
						
				var roleData = {
					name: name,
					ACL: {
						"*": {
							read: true
						},
							"role:Admin": {
							"write": true
						}
					}
				}
				if(roleArr && roleArr.length){
					var ptrs = [];
					for(var i=0; i<roleArr.length; i++)
						ptrs.push(tools.pointer.role(roleArr[i]))
					roleData.roles = {
						__op: "AddRelation",
						objects: ptrs
					}
				}
				if(userArr && userArr.length){
					var ptrs = [];
					for(var i=0; i<userArr.length; i++)
						ptrs.push(tools.pointer.user(userArr[i]))
					roleData.users = {
						__op: "AddRelation",
						objects: ptrs
					}
				}
				
				Roles.save(roleData).then(function(response){
					it.roleResp = response;
				})
			},
			set: function(role){
				role.edit=true;
				$scope.editRole = role;
				$http.get(config.parse.root+'/users?where={"$relatedTo":{"object":{"__type":"Pointer","className":"_Role","objectId":"'+role.objectId+'"},"key":"users"}}').success(function(data){
					role.users 			= [];
					role.addRelation 	= [];
					role.removeRelation = [];
					for(var i=0; i<data.results.length; i++)
						Users.lookup(data.results[i].objectId).then(function(user){
							role.users.push(user);
						})
				})
			},
			edit: function(role){
				if($scope.editRole)
					tools.roles.save($scope.editRole).then(function(){
						tools.roles.set(role);
					})
				else
					tools.roles.set(role);
			},
			save: function(role){
				var defer = $q.defer();
				role.edit=false;
				$scope.editRole = null;
				//add/remove users from role.
				var arelations 	= []
				var rrelations 	= []
				for(var i=0; i<role.addRelation.length; i++)
					arelations.push(Users.pointer(role.addRelation[i]))
				for(var i=0; i<role.removeRelation.length; i++)
					rrelations.push(Users.pointer(role.removeRelation[i]))
				
				var ar = angular.copy(role);
				delete ar.name;
				delete ar.ACL;
				delete ar.edit;
				delete ar.roles;
				delete ar.addRelation;
				delete ar.removeRelation;
				var rr = angular.copy(ar);
				
				if(arelations.length > 0){
					ar.users = {
						__op: "AddRelation",
						objects: arelations
					}
					rr.users = {
						__op: "RemoveRelation",
						objects: rrelations
					}
	
					Roles.save(ar).then(function(results){
						Roles.save(rr).then(function(results){
							console.log(results);
							defer.resolve(results);
						})
					})
				}else if(rrelations.length > 0 ){
					rr.users = {
						__op: "RemoveRelation",
						objects: rrelations
					}
	
					Roles.save(rr).then(function(results){
						console.log(results);
						defer.resolve(results);
					})
				}else{
					defer.resolve();
				}
				return defer.promise;
			},
			revoke: function(user){
				var role = $scope.editRole;
				
				var i = role.users.indexOf(user);
					role.users.splice(i, 1);
				var i = role.addRelation.indexOf(user);
					role.addRelation.splice(i, 1);
				
				if(!role.removeRelation)
					role.removeRelation = [];
				role.removeRelation.push(user);
			},
			assign: function(user){
				var role = $scope.editRole;
				
				var i = role.removeRelation.indexOf(user);
					role.removeRelation.splice(i, 1);
				
				role.users.push(user);
				if(!role.addRelation)
					role.addRelation = [];
				role.addRelation.push(user);
			},
			canAddUser: function(user){
				var role = $scope.editRole;
				if(!role)
					return false;
				else
					if(role.users && role.addRelation)
						if(role.users.indexOf(user) == -1 && role.addRelation.indexOf(user) == -1)
							return true;
						else
							return false;
					else
						return false;
			}
		},
		users:{
			edit: function(user){
				if($scope.editUser){
					tools.users.save($scope.editUser).then(function(){
						user.edit=true;
						$scope.editUser = user;
					})
				}else{
					user.edit=true;
					$scope.editUser = user;
				}
				//List all roles assigned to selected user
			},
			save: function(user){
				var defer = $q.defer();
				user.edit=false;
				$scope.editUser = null;
				//add/remove users from user.
				toastr.info('Saving User')
				defer.resolve();
				return defer.promise;
			}
		}
	}
	
	tools.init();
	it.AdminRoles = $scope;
});