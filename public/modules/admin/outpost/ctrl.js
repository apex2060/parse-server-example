app.lazy.controller('AdminOutpostCtrl', function($rootScope, $scope, $routeParams, $timeout, $http, config, Easy, FileService){
	$scope.Easy = Easy;


	var tools = $scope.tools = {
		outpost: {
			init: function(){
				tools.outpost.list();
			},
			list: function(){
				$http.get(config.parse.root+'/classes/Outposts').success(function(data){
					if(data.results){
						var o = $scope.outposts = data.results;
						for(var i=0; i<o.length; i++)
							o[i].weather = new Easy.weather(o[i].loc.city+', '+o[i].loc.state);
					}else{
						$scope.outposts = [];
					}
				});
			},
			add: function(){
				$scope.outposts.push({});
			},
			delete: function(outpost){
				if(confirm('Are you sure you want to delete this location?')){
					var i = $scope.outposts.indexOf(outpost);
					var copy = angular.copy(outpost);
					$scope.outposts.splice(i, 1);
					if(outpost.objectId)
						$http.delete(config.parse.root+'/classes/Outposts/'+outpost.objectId).success(function(response){
							// $scope.outposts.splice(i, 1);
						}).error(function(response){
							$scope.outposts.splice(i, 0, copy);
						})
					// else
					// 	$scope.outposts.splice(i, 1);
				}
			},
			save: function(outpost){
				var tempOutpost = angular.copy(outpost);
				delete tempOutpost.objectId;
				delete tempOutpost.createdAt;
				delete tempOutpost.updatedAt;
				delete tempOutpost.hover;
				delete tempOutpost.weather;
				
				if(outpost.objectId)
					$http.put(config.parse.root+'/classes/Outposts/'+outpost.objectId, tempOutpost).success(function(response){
						$scope.response = response;
					});
				else{
					$http.post(config.parse.root+'/classes/Outposts', tempOutpost).success(function(response){
						outpost.objectId = response.objectId;
					});
				}
			},
			modify: {
				map: function(outpost){
					$scope.drawer = {
						outpost: 	outpost,
						partial: 	'partials/map.html',
						height: 	'300px',
						visable: 	true
					}
				},
				weather: function(outpost){
					if(outpost.weather)
						outpost.weather.load(outpost.loc.city+', '+outpost.loc.state);
					else
						outpost.weather = new Easy.weather(outpost.loc.city+', '+outpost.loc.state);
				}
			},
			setHeadPic:function(data){
				var outpost = data.parent;

				if(!outpost.img)
					outpost.img = {};
				
				$timeout(function(){ 
					outpost.img.head = {
						temp: true,
						status: 'uploading',
						class: 'gray',
						title: 'Image Uploading...',
						src: data.src
					}
				});

				FileService.upload('OutpostPic',data.src).then(function(data){
					outpost.img.head = {
						title: data.name(),
						src: data.url()
					}
					tools.outpost.save(outpost);
				});
			}
		},
		map: {
			setGeo: function(geo){
				var loc = {
					"__type": 	"GeoPoint",
					latitude: 	geo.latitude,
					longitude: 	geo.longitude
				}
				$timeout(function(){ 
					$scope.drawer.outpost.geo = loc;
				});
			}
		}
	}

	tools.outpost.init();
	
	it.AdminOutpostCtrl = $scope;
});