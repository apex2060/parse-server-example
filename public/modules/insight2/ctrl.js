app.lazy.controller('InsightCtrl', function($scope, $routeParams, $location, $sce, $q, config, Auth, Parse){
	var Insight = new Parse('Insights', true);
	
	$scope.moment = moment;
	$scope.Live = {};
	$scope.Data = {};
	$scope.data = {};
	$scope.params = $routeParams;
	$scope.search = $location.search();
	var defaultInsight = {
		permalink: $routeParams.view,
		template: '',
		data: [],
		meta: {
			dataKeys: [],
		}
	}
	
	
	var analyze = {
		init: function(iData, data){
			// function comments(){
			// 	//The first thing that needs done, is to find any relations between multiple data sources.
			// 	//If there are multiple data sources, loop through and associate such info.
			// 	//If one data source contains pointers to the other data source, that is the most simple association.
			// 	//If there is text in one data source that matches the other, that would be acceptable.
			// 	//Dates and times can somewhat coencide, but they have no direct relationship.  
			// 		//THey could be useful for making comparisons between quantities by date. (line-chart)
			// 	//Get all data and loop through it to find patterns, and relations.
			// 	//Find:
			// 		//Geo Points	>> Maps
			// 		//Dates 		>> Timelines
			// 		//Links 		>> --
			// 			//Pictures	>> Photo Gallery, 
			// 			//PDF		>> iFrame
			// 			//Video		>> --
			// 			//MP3		>> --
			// 		//Pointers		>> relations & dive deeper
			// 		//Text			>> chart labels
			// 		//Numbers		>> chart values
			// 		//Arrays/obj	>> Dive deeper
			// 	//Group:
			// 		//Text
			// 		//Pointers
			// 		//Dates
			// 			// Hour, Day, Week, Month, Year (Allow for any start & interval)
						
			// 	//Do we guide the user through any prompts?
			// 		//ie: You loaded multiple data sources, would you like to compare data between them, or would you like to associate them?
			// 			//
			// 		//What unit would you like to compare? (display numerical, and geo-point data)
			// 		//Would you like to group this data in any way?
			// 		//Would you like to display the sum or average?
			// 	}
			/*
				Graph parameters need to be assigned as vars that can change
				Graph options need to be available for such parameters
			*/
			$scope.insight.meta = iData.map(function(refrence){
				return {
					alias:		refrence.alias,
					table:		refrence.table,
					cols:		Object.keys(data[refrence.alias][0]),
					data:		data[refrence.alias],
					relations:	[]
				}
			})
			$scope.insight.viz = Object.keys(analyze.relations).map(function(key){
				return analyze.relations[key]($scope.insight.meta)
			})
		},
		dataTypes: function(obj){
			return Object.keys(obj).map(function(key){
				var type = typeof obj[key]
				if(typeof obj[key] == 'object')
					if(obj[key].__type)
						type = obj[key].__type
					else if(obj[key] instanceof Array)
						type = 'array'
					else
						type = 'object'
				return {
					key: key,
					type: type
				}
			})
		},
		relations: {
			common: function(meta){
				//If multiple data points are pointing to the same table, but have different queries...
				//Then we are fairly safe to assume a comparison relationship between the data.
				//THis could be numbers between jobs, 
				meta = angular.copy(meta)
				var charts = []
				while(meta.length){
					var m = meta.pop()
					var family = [m];
					var matches = meta.filter(function(m1){return m1.table = m.table})
					matches.forEach(function(match){
						family.push(match);
						meta.splice(meta.indexOf(match), 1)
					})
					if(family.length > 1){
						var dataTypes = analyze.dataTypes(family[0].data[0])
						if(!it.dataTypes)
							it.dataTypes = []
						it.dataTypes.push(dataTypes)
						
						var numberCols = dataTypes.filter(function(col){ return col.type == 'number' })
						var stringCols = dataTypes.filter(function(col){ return col.type == 'string' })
						console.log(numberCols,stringCols)
						console.log(family[0].data)
						//all entries for a given string column //as compiled from all families
						var labels = family[0].data.map(function(entry){
							return entry[stringCols[0].key]
						})
						var data = [];
						family.forEach(function(fam){
							data.push(
								fam.data.map(function(entry){
									return entry[numberCols[0].key]
								})
							)
						})
						var series = family.map(function(fam){return fam.alias})
						
						charts.push({
							template:	'line.vis',
							labels: 	labels,
							data:		data,
							series: 	series
						})
					}
				}
				return {
					title:		'Same Table Data Compare',
					type:		'common',
					charts:		charts
				}
			},
			groupCompare: function(meta){
				//If there is a large amount of data within 1 table, on may want to gorup that data and show a comparison in values between the groups.
				//This could also be useful if there is an array within a dataset.  Each array could represent a series of data.
				return {
					title:		'Group Comparisons'
				}
			},
			pointer: function(data){
				return {
					title:		'Pointers'
				}
			}
		}
	}
	
	// [] Load existing templates as options.
	var templateLibrary = {
		table: function(data){
			//do something with the data to understand and format it for the template.
			var keys = Object.keys(data);
			//TODO: Make it possible to select which data set?
			var dataset = data[keys[0]];
			if(dataset){
				var formated = {
					columns: 	Object.keys(dataset[0]),
					rows: 		dataset
				}
				$scope.formated = formated;
				$scope.vjs = {};
			}
		},
		line: function(data){
			//from interface, let them choose label and metric
			var keys = Object.keys(data);
			var dataset = data[keys[0]];
			if(!dataset)return;
			var columns = Object.keys(dataset[0])

			$scope.line = {
				columns: 	columns,
				label: 		columns[0],
				metric: 	columns[1],
				data: 		dataset
			}
			$scope.vjs = {
				format: function(){
					$scope.formated = {labels: [], data: [[]], series: ['Data']}
					$scope.line.data.forEach(function(row){
						$scope.formated.labels.push(row[$scope.line.label])
						$scope.formated.data[0].push(row[$scope.line.metric])
					})
				},
				setLabel: function(column){
					$scope.line.label = column
					$scope.vjs.format()
				},
				setMetric: function(column){
					$scope.line.metric = column
					$scope.vjs.format()
				}
			}
			$scope.vjs.format();
		},
		bar: function(data){
			//from interface, let them choose label and metric
			var keys = Object.keys(data);
			var dataset = data[keys[0]];
			if(!dataset)return;
			var columns = Object.keys(dataset[0])

			$scope.bar = {
				columns: 	columns,
				label: 		columns[0],
				metric: 	columns[1],
				data: 		dataset
			}
			$scope.vjs = {
				format: function(){
					$scope.formated = {labels: [], data: [[]], series: ['Data']}
					$scope.bar.data.forEach(function(row){
						$scope.formated.labels.push(row[$scope.bar.label])
						$scope.formated.data[0].push(row[$scope.bar.metric])
					})
				},
				setLabel: function(column){
					$scope.bar.label = column
					$scope.vjs.format()
				},
				setMetric: function(column){
					$scope.bar.metric = column
					$scope.vjs.format()
				}
			}
			$scope.vjs.format();
		},
		polar: function(data){
			//from interface, let them choose label and metric
			var keys = Object.keys(data);
			var dataset = data[keys[0]];
				if(!dataset)return;
			var columns = Object.keys(dataset[0])

			$scope.polar = {
				columns: 	columns,
				label: 		columns[0],
				metric: 	columns[1],
				data: 		dataset
			}
			$scope.vjs = {
				format: function(){
					$scope.formated = {labels: [], data: []}
					$scope.polar.data.forEach(function(row){
						$scope.formated.labels.push(row[$scope.polar.label])
						$scope.formated.data.push(row[$scope.polar.metric])
					})
				},
				setLabel: function(column){
					$scope.polar.label = column
					$scope.vjs.format()
				},
				setMetric: function(column){
					$scope.polar.metric = column
					$scope.vjs.format()
				}
			}
			$scope.vjs.format();
		},
		map: function(data){
			var keys = Object.keys(data);
			var dataset = data[keys[0]];
			if(!dataset)return;
			function geoKeys(data){
				var keys = Object.keys(data);
				return keys.filter(function(key){
					return data[key].__type == 'GeoPoint'
				})
			}
			
			$scope.formated = {markers: []}
			//we should test more then the first entry...
			geoKeys(dataset[0]).forEach(function(geoKey){
				dataset.forEach(function(row){
					$scope.formated.markers.push({
						point: 	row[geoKey],
						data: 	row
					})
				})
			})
			$scope.vjs = {
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
					t.lastSeen = moment(t.seenDate.iso).add('h',6)
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
	}
	var tools = $scope.tools = {
		init: function(){
			tools.get();
			tools.keyEvents();
			$scope.$on('$locationChangeStart', function(event) {
				tools.data.unListen()
				if($routeParams.view == $scope.insight.permalink)
					tools.setup($scope.insight)
				else{
					delete $scope.insight
					tools.get();
				}
			});
		},
		keyEvents: function(){
			require(['vendor/mousetrap.js'], function(Mousetrap){
				Mousetrap.bind('ctrl+e', function(e){
					if(Auth.is('Admin'))
						tools.edit();
				});
				Mousetrap.bind(['ctrl+s', 'meta+s'], function(e){
					if (e.preventDefault) {
						e.preventDefault();
					}
					else {
						e.returnValue = false;
					}
					if(Auth.is('Admin'))
						tools.save();
				});
			});
			$scope.$on('$routeChangeStart', function(next, current) {
				Mousetrap.reset();
			});
		},
		get: function(){
			// [] Make this content available offline once loaded for the first time.
			if($scope.insight){
				tools.setup($scope.insight)
			}else{
				if($routeParams.id){
					Insight.get($routeParams.id).then(function(result){
						$scope.insight = result || defaultInsight;
						tools.setup($scope.insight)
					})
				}else{
					Insight.query('?where={"permalink":"'+$routeParams.view+'"}').then(function(list){
						$scope.insight = list[0] || defaultInsight;
						tools.setup($scope.insight)
					})
				}
			}
		},
		setup: function(insight){
			var promises = []
			for(var i=0; i<insight.data.length; i++)
				promises.push(tools.data.init(insight.data[i]))
			$q.all(promises).then(function(){
				$scope.template = insight.template;
				eval('$scope.js = '+insight.js)
				if($scope.js && $scope.js.init)
					$scope.data = $scope.js.init($scope.data) || $scope.data;
				analyze.init($scope.insight.data, $scope.data)
			})
		},
		data: {
			init: function(request){
				var deferred = $q.defer();
				tools.data.get(request).then(function(list){
					$scope.data[request.alias] = list;
					deferred.resolve(list)
				})
				return deferred.promise;
			},
			unListen: function(){
				var keys = Object.keys($scope.Live)
				keys.forEach(function(key){
					$scope.Live[key].ref.off('value')
				})
			},
			get: function(request){
				if($scope.Data[request.alias]){
					var data = $scope.Data[request.alias]
					var live = $scope.Live[request.table]
				}else{
					var data = $scope.Data[request.alias] = new Parse(request.table, true); //[] Allow this (immediate) to be defined by the user
					var live = $scope.Live[request.table] = {
						request: 	request,
						ref: 		Firebase.database().ref('/class/'+request.table+'/updatedAt'),
						// ref: 		new Firebase(config.firebase+'/class/'+request.table),
						timestamp: 	false
					}
					live.ref.on('value', function(ds){
						if(!live.timestamp)
							live.timestamp = ds.val().time
						else if(live.timestamp != ds.val().time)
							tools.init();
					})
				}
				
				var vars = $location.search();
				var query = request.query;
				if(request.query && request.rpv)
					for(var i=0; i<request.rpv.length; i++)
						query = query.replace('%'+request.rpv[i]+'%', vars[request.rpv[i]])
						
				if(query)
					return data.query(query)
				else
					return data.list()
			},
			add: function(){
				$scope.insight.data.push({})
			}
		},
		template: {
			list: function(){
				return Object.keys(templateLibrary)
			},
			set: function(vis){
				if(vis){
					templateLibrary[vis]($scope.data)
					$scope.insight.vis = vis;
					$scope.insight.template = vis+'.vis'
				}
			}
		},
		edit: function(){
			$('#editInsight').modal('show')
		},
		preview: function(){
			$scope.insight.data = tools.format($scope.insight.data)
			tools.setup($scope.insight);
		},
		save: function(){
			$scope.insight.data = tools.format($scope.insight.data)
			Insight.save($scope.insight).then(function(insight){
				$scope.insight = insight;
				toastr.success('Insight Saved');
			})
		},
		format: function(queries){
			for(var i=0; i<queries.length; i++){
				var query = '--'+queries[i].query+'--';
				query = query.split("\%");
				queries[i].rpv = [];
				for(var ii=0; ii<query.length; ii++)
					if(ii%2)
						queries[i].rpv.push(query[ii])
			}
			return queries;
		},
		
		focus: function(item){
			$scope.focus = item;
		},
		modal: function(modal){
			$(modal).modal('show');
		},
		focusModal: function(item, modal){
			tools.focus(item);
			tools.modal(modal);
		}
	}
	tools.init();
	it.InsightCtrl = $scope;
});