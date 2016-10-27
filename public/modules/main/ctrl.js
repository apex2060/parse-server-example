app.lazy.controller('MainCtrl', function($rootScope, $scope, $routeParams, $http, config, Easy, Data){
		$scope.Easy = Easy;
		var Outpost = new Data('Outposts');
		
		Outpost.tools.list().then(function(outposts){
			it.o = outposts;
			var operations = outposts.filter(function(outpost){
					return outpost.public;
				})
			var slides = [];
			for(var i=0; i<operations.length; i++){
				var operation = operations[i];
				try{
					operation.weather = new Easy.weather(operation.loc.city+', '+operation.loc.state);
					if(operation.public)
						slides.push({
							title: operation.title,
							description: operation.description,
							img: {
								src: operation.img.head.src,
								description: ''
							},
							link: {
								style: 'btn-info', //Bootstrap Button Style
								href: '#/operations/'+operation.objectId,
								text: 'Details' //Displayed in button
							}
						})
				}catch(e){
					console.log(e);
				}
			}
			
			$scope.manifest = [
				{
					type: 'carousel',
					slides: slides
				},
				{
					type: 'outpostCards',
					title: 'Locations',
					cards: operations
				}
			]
		})


	var data = $scope.data = {
		welcome: 'Hi There!',
	}
	var tools = $scope.tools = {
		
	}

	
	it.MainCtrl = $scope;
});