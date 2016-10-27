app.lazy.controller('ReportsCtrl', function($rootScope, $scope, $routeParams, $http, $q, $compile, $sce, config, Easy, Data, Auth){
	$scope.temp = {};
	$scope.rp = $routeParams;
	var Reports = Data('Reports');

	var tools = $scope.tools = {
		url: function(){
			if($routeParams.view)
				return '/modules/reports/'+$routeParams.view+'.html'
			else
				return '/modules/reports/default.html'	
		},
		init: function(){
			$scope.report = {
				type: 			'list',
				table: 			'ScaleVehicles',
				query: 			'where={"tare":{"$lte":25000}}',
				queryId: 		'0NQtRzmHCa',
				template: 		'<h1>{{reportTransform}} Items</h1><ul class="list-group"><li ng-repeat="item in reportData" class="list-group-item">{{item.vId}}</li></ul>',
				transformation: '(function(list){return list.length})'
			}
		},
		obtain: function(reportId){
			var deferred = $q.defer();
			Auth.init().then(function(){
				deferred.resolve($scope.report);
			})
			return deferred.promise;
		},
		generate: function(reportId){
			tools.obtain(reportId).then(function(report){
				tools[report.type](report);
			})
		},
		single: function(report){
			var url = 'https://api.parse.com/1/classes/'+report.table
			if(report.query)
				url += '/'+report.queryId;
			$http.get(url).success(function(data){
				$scope.reportData = data;
				if(report.transformation){
					$scope.reportTransform = eval(report.transformation.toString())($scope.reportData)
				}
			})
		},
		list: function(report){
			var url = 'https://api.parse.com/1/classes/'+report.table
			if(report.query)
				url += '?'+report.query;
			$http.get(url).success(function(data){
				$scope.reportData = data.results;
				if(report.transformation){
					$scope.reportTransform = eval(report.transformation.toString())($scope.reportData)
				}
			})
		},
		elements: {
			list: function(){
				$scope.html
			}
		}
	}
	
	tools.init();
	it.ReportsCtrl = $scope;
});