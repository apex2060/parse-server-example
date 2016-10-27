app.lazy.controller('TestCloudinaryCtrl', function($scope, $http, config) {
	$scope.form = {}
	var tools = $scope.tools = {
		image: function(img) {
			$scope.form.file = img.src
			$scope.form.upload_preset = 'mainSite'
		},
		upload: function() {
			$http({
				method: 'POST',
				url: 'https://api.cloudinary.com/v1_1/easyBusiness/image/upload',
				data: $scope.form,
				headers: {
					'X-Parse-Application-Id': undefined,
					'X-Parse-REST-API-Key': undefined,
					'X-Parse-Session-Token': undefined,
				}
			}).success(function(data) {
				$scope.result = data
			})
		}
	}

	it.TestCloudinaryCtrl = $scope;
});