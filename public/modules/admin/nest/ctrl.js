app.lazy.controller('NestCtrl', function($scope, $http, Auth, Parse, config){
	var Nest = new Parse('Nest');
	
	var tools = $scope.tools = {
		init: function(){
			Nest.query('?include=user').then(function(accounts){
				$scope.accounts = accounts;
			})
		},
		register: function(code){
			$http.post(config.parse.root+'/functions/nestRegister', {code:code}).success(function(data){
				$scope.nest = data.result;
				toastr.success('Nest Link Successful!')
			})
		},
		devices: function(nestId){
			$http.post(config.parse.root+'/functions/nestDevices', {nestId:nestId}).success(function(response){
				var cameras     = $scope.cameras    = response.result.cameras;
				var cameraIds   = $scope.cameraIds  = Object.keys(cameras);
				toastr.success('Data Pull Successful!')
			})
		}
	}
	
	tools.init();
	it.NestCtrl = $scope;
});