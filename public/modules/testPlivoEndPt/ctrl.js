app.lazy.controller('EndpointTest', function($scope, $http, Auth, config) {
    
    var tools = $scope.tools = {
        create: function(params){
        	$http.post(config.parse.root+'/functions/createEndpoint', params).success(function(data){
            	$scope.endpoint = data;
            })
        }
    }
	it.EndpointTest = $scope;
});