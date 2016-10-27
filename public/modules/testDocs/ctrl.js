app.lazy.controller('TestDocsCtrl', function($rootScope, $scope, $http, config, Google){
	// it.auth2;
	gapi.load('auth2', function() {
		it.auth2 = gapi.auth2.init({
			client_id: config.google.client_id,
			scope: 'https://www.googleapis.com/auth/calendar, https://www.googleapis.com/auth/drive'
		});
	});
	
	// var req = $scope.req = {};
	// $scope.regex = [{name:'name',exp:'Name: .*'}];
	
	var tools = $scope.tools = {
		list: function(){
			var url = 'https://www.googleapis.com/drive/v3/files'
			Google.request(url, null, 'GET').then(function(data){
				$scope.drive = data;
			})
		},
		get: function(fileId){
			var fields = ['name','description','webContentLink','thumbnailLink','iconLink']
			fields = fields.join('%2C')
			// var url = 'https://www.googleapis.com/drive/v3/files/'+fileId+'?fields='+fields
			var url = 'https://content.googleapis.com/drive/v2/files/'+fileId+'?alt=media'
			Google.request(url, null, 'GET').then(function(data){
				$scope.file = data;
			})
		}
	}
	
	it.TestDocsCtrl = $scope;
});