app.lazy.controller('EmployeeProfileCtrl', function($rootScope, $scope, $routeParams, $http, $timeout, $q, config, FileService, Auth){
	$scope.config = config;
	
	var tools = $scope.tools = {
		init: function(){
			Auth.tools.init().then(function(user){
				$scope.profile = user.profile;
			})
		},
		profile: {
			save: function(){
				Auth.tools.init().then(function(user){
					var profile = angular.copy($scope.profile);
						
						profile.ACL = {
							"*": {}
						}
						profile.ACL[user.pAuth.user.objectId] = {
							"read": true,
							"write": true
						}
					if(profile.objectId){
						var oId = profile.objectId;
						delete profile.objectId;
						delete profile.createdAt;
						delete profile.updatedAt;
						$http.put(config.parse.root+'/classes/UserProfile/'+oId, profile).success(function(){
							alert('Thanks for saving your profile!')
						})
					}else{
						$http.post(config.parse.root+'/classes/UserProfile', profile).success(function(){
							alert('Thanks for saving your profile!')
						})
					}
				});
			},
			signature: {
				sign: function(sig){
					$scope.sig = sig;
					if(!$scope.profile.signature)
						$scope.profile.signature = {};
					
					$timeout(function(){ 
						$scope.profile.signature = {
							temp: true,
							class: 'gray',
							title: 'Image Uploading...',
							src: sig.src
						}
					});
				},
				set: function(data){
					var profile = data.parent;
					if(!$scope.profile.signature)
						$scope.profile.signature = {};
					
					$timeout(function(){ 
						$scope.profile.signature = {
							temp: true,
							class: 'gray',
							title: 'Image Uploading...',
							src: data.src
						}
					});
				},
				clear: function(){
					$('#signature').jSignature("reset");
				},
				save: function(){
					var sig = $scope.sig
					FileService.upload('signature', sig.src).then(function(data){
						$scope.profile.signature = {
							title: data.name(),
							src: data.url()
						}
					});	
				}
			},
		}
	}
	
	tools.init();
	it.EmployeeProfileCtrl = $scope;
});