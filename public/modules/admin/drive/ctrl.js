app.lazy.controller('AdminDriveCtrl', function($rootScope, $scope, $sce, $routeParams, $http, $q, config, SpreadSheet, Data, Auth){
	Auth.tools.google.scopes('https://www.googleapis.com/auth/drive');

	var tools = $scope.tools = {
		drive: {
			list: function(){
				var token = Auth.gAuth.access_token;
				var url = 'https://www.googleapis.com/drive/v2/files?access_token='+token;
				$http.get(url).success(function(result){
					$scope.docList = result.items;
				}).error(function(error){
					console.error(error);
				})
			},
			get: function(file){
				var token = Auth.gAuth.access_token;
				var url = 'https://spreadsheets.google.com/feeds/list/' + file.id + '/1/private/full?alt=json-in-script&access_token=' + token+'&callback=JSON_CALLBACK';
				$http.jsonp(url).success(function(data){
					it.d = data;
				})
			},
			focus: function(file){
				$scope.file = file;
			},
			render: function(url){
				if(url){
					return $sce.trustAsResourceUrl(url+'&output=embed')
				}
			}
		}
	}
	it.AdminDriveCtrl = $scope;
});