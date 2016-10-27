app.lazy.controller('DispatchCtrl', function($scope, $http, $timeout, NgMap, Auth, Parse, config){
	var DispatchFleet = new Parse('DispatchFleet');
	
	config.hourOffset = 6;
	$scope.moment = moment;
	// NgMap.getMap().then(function(map) {
	// 	$scope.map = map;
	// });
	var tools = $scope.tools = {
		init: function(){
			tools.fleet.init();
		},
		fleet: {
			init: function(){
				tools.fleet.load();
			},
			load: function(){
				var liveFleet = Firebase.database().ref('/class/DispatchFleet')
				// var liveFleet = new Firebase(config.firebase+'/class/DispatchFleet')
				liveFleet.on('value', function(){
					DispatchFleet.list().then(function(fleet){
						$scope.fleet = fleet;
						if($scope.truck){
							$scope.truck = fleet.find(function(t){
								return t.objectId == $scope.truck.objectId;
							})
						}
					})
				})
			}
		},
		truck: {
			route: function(truck){
				$http.post(config.parse.root+'/functions/singleRoute', truck).success(function(r){
					// $scope.route = r
					$scope.route = r.result.map(function(pt){return [pt.lat, pt.lng]})
				}).error(function(e){
					toastr.error('Error Loading Data.')
				})
			},
			setMarker: function(truck){
				cloudinary.openUploadWidget({
					cloud_name: .cloud_name,
					upload_preset: .preset,
					theme: 'white',
					multiple: false,
				},
				function(error, result) {
					if(result)
						truck.marker = {
							etag: result[0].etag,
							public_id: result[0].public_id,
							secure_url: result[0].secure_url,
							thumbnail_url: result[0].thumbnail_url,
							url: result[0].url
						}
					$scope.$apply();
				});
			},
			marker: function(truck){
				if(truck.marker)
					return {
						url: truck.marker.thumbnail_url
					}
				else
					return {url: 'https://res.cloudinary.com/easybusiness/image/upload/v1460437231/mainSite/daejba2fct7e7pexjidn.png'}
			},
			direction: function(heading){
				var directions = ['N','NE','E','SE','S','SW','W','NW']
				if(heading)
					return directions[Math.floor(heading/45)]
			},
			info: function(m,t){
				t.lastSeen = moment(t.seenDate.iso).add('h',config.hourOffset)
				$scope.truck = t
				$('#truckInfo').modal('show')
			},
			geoPoint: function(geoPoint){
				return geoPoint.latitude+','+geoPoint.longitude
			},
			save: function(truck){
				DispatchFleet.save(truck).then(function(s){
					toastr.success('Vehicle Saved')
				}, function(e){
					toastr.error(e)
				})
			}
		}
	}
	Auth.init().then(function(){
		tools.init();
	})
	it.MapsCtrl = $scope;
});