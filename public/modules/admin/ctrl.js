app.lazy.controller('AdminCtrl', function($scope, $routeParams, Auth, Parse){
	var Config = new Parse('Config');
	var defaultConfig = {
		cards: []
	}
	
	var tools = $scope.tools = {
		init: function(){
			Config.query('?where={"type":"adminPortal"}').then(function(list){
				$scope.admin = list[0] || defaultConfig;
			})
		}
	}
	tools.init();
	
	it.AdminCtrl = $scope;
});

//{{ observations | map:"location" }}