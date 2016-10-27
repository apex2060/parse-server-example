app.lazy.controller('CalTest', function($scope, $http, Auth, config) {
    
    var tools = $scope.tools = {
        list: function(){
        	$http.post(config.parse.root+'/functions/CalendarList', {minAccessRole: 'writer'}).success(function(data){
            	$scope.calendars = data.result.items;
            })
        }
    }
	Auth.init().then(function(){
	    tools.list();
	})
	
	it.CalTest = $scope;
});