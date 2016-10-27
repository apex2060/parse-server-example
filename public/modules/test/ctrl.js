app.lazy.controller('TestCtrl', function($rootScope, $scope, $http, config){
	it.auth2;
	gapi.load('auth2', function() {
		it.auth2 = gapi.auth2.init({
			client_id: config.google.client_id,
			scope: 'https://www.googleapis.com/auth/calendar, https://www.googleapis.com/auth/drive'
		});
	});
	
	var req = $scope.req = {};
	$scope.regex = [{name:'name',exp:'Name: .*'}];
	
	var tools = $scope.tools = {
		parse: function(){
			alert('sorting')
			var data = $scope.messageTxt;
			var req = $scope.req = {};
			for(var i=0; i<$scope.regex.length; i++)
				req[$scope.regex[i].name] = data.match($scope.regex[i].exp)
		},
		add: function(name,exp){
			$scope.regex.push({name:name,exp:exp})
		},
		auth: function(){
			it.auth2.grantOfflineAccess({redirect_uri: 'postmessage',  access_type: 'offline'}).then(function(response){
				$http.post(config.parse.root+'/functions/gAuth2', {
					user: $rootScope.user.objectId,
					code: response.code
				})
			});
		}
	}
	
	it.TestCtrl = $scope;
});