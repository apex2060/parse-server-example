/*
	Interesting issues:
	- This does not work well with Meraki where 100s of entries are being modified every few seconds.
	It tries to updaate and re-process the data (which is large) and locks up the entire interface.
	- It doesn't work well with large amounts of data.
	- Naturally the data is incomplete when we are only pulling 100 records but there are thousands in the DB.
	>> We may need to move the data-processing to a webworker.  We should also disable the auto updates
	when data is being updated constantly.
	>> 
*/
app.lazy.controller('InsightCtrl', function($scope, $routeParams, $location, $sce, $q, config, Auth, Parse){
	var Insight = new Parse('Insights', true);
	var Forms = new Parse('Forms');

	
	$scope.moment = moment;
	$scope.Live 	= {};
	$scope.Data 	= {};
	$scope.newData	= {};
	$scope.data 	= {};
	$scope.filter	= {};
	$scope.params = $routeParams;
	$scope.search = $location.search();
	
	var defaultInsight = {
		permalink: $routeParams.view,
		template: 'table.vis',
		data: [{alias: $routeParams.view, table: $routeParams.view}]
	}
	
	Auth.init().then(function(){
		Parse.prototype.schema().then(function(schema){
			$scope.schema = schema
			tools.init();
		})
	})
	
	$scope.$on('chart-create', function(event, chart) {
		$scope.chart = chart;
	});
	
	// [] Load existing templates as options.
	var chart = function(type, data){
		var keys = Object.keys(data);
		var dataset = data[keys[0]];
		if(dataset && dataset.length){
			var columns = Object.keys(dataset[0])
			
			if(!$scope.chartData){
				$scope.chartData = {
					type:		type,
					columns: 	columns,
					label: 		columns[0],
					metric: 	columns[1],
					data: 		dataset
				}
			}else{
				$scope.chartData.type = type;
				$scope.chartData.columns = columns;
				$scope.chartData.data = dataset;
			}
			$scope.vjs = {
				format: function(){
					$scope.formated = {labels: [], data: []}
					$scope.chartData.data.forEach(function(row){
						$scope.formated.labels.push(row[$scope.graph.label])
						$scope.formated.data.push(row[$scope.graph.metric])
					})
				},
				setLabel: function(column){
					$scope.graph.label = column
					$scope.vjs.format()
				},
				setMetric: function(column){
					$scope.graph.metric = column
					$scope.vjs.format()
				},
				onClick: function(e,c){
					var data = $scope.newData;
					var keys = Object.keys(data);
					var dataset = data[keys[0]];
					if(c.ctrlKey){
							dataset.splice(e[0]._index, 1);
						chart(type, {data: dataset})
						$scope.$apply();
					}else{
						var obj = dataset[e[0]._index];
						$scope.focus = {
							item:		obj,
							table:		$scope.focusTable.name,
							columns:	Object.keys(obj),
							list:		[obj],
							forms:		$scope.forms
						}
						$scope.$apply();
						$('#PtrModal').modal('show');
					}
				}
			}
			$scope.vjs.format();
		}else{
			toastr.error('No Data In Range')
		}
	}
	var templateLibrary = {
		table: function(data){
			//do something with the data to understand and format it for the template.
			var keys = Object.keys(data);
			//TODO: Make it possible to select which data set?
			var dataset = data[keys[0]];
			if(dataset && dataset.length){
				var formated = {
					columns: 	Object.keys(dataset[0]),
					rows: 		dataset
				}
				$scope.formated = formated;
				$scope.vjs = {};
			}else{
				toastr.error('No Data In Range')
			}
		},
		line: function(data){
			chart('line', data)
		},
		bar: function(data){
			chart('bar', data)
		},
		doughnut: function(data){
			chart('doughnut', data)
		},
		radar: function(data){
			chart('radar', data)
		},
		pie: function(data){
			chart('pie', data)
		},
		polar: function(data){
			chart('polar', data)
		},
		horizontal: function(data){
			chart('horizontal', data)
		},
		bubble: function(data){
			chart('bubble', data)
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
						cloud_name: config.cloudinary.name,
						upload_preset: config.cloudinary.preset,
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
				if(insight.js && insight.js.length)
					eval('var js = $scope.js = '+insight.js)
				if($scope.js && $scope.js.init)
					$scope.data = $scope.js.init($scope.data) || $scope.data;
				if(insight.vis)
					tools.template.set(insight.vis)
					
				if(!$scope.tables)
					tools.filter.init($scope.data)
				else
					tools.applyRules();
			})
		},
		dataCols: function(tableId, list){
			var noEdit = ['objectId', 'createdAt', 'updatedAt']
			function checkType(masterObj, key){
				if(masterObj && masterObj[key] != undefined)
					if(!isNaN(masterObj[key]))
						return {type: 'number', value: masterObj[key]}
					else
						return {type: typeof(masterObj[key]), value: masterObj[key]}
				else
					return {type: 'unknown', value: masterObj[key]}
			}
			
			var masterObj = angular.copy(list[0])
			if(list.length){
				var max = list.length > 10 ? 10 : list.length;
				for(var i=1; i<max; i++){
					var sample = Math.round((list.length-1) / i)
					masterObj = angular.extend(masterObj, list[sample])
					Object.keys(masterObj).forEach(function(key){
						if(masterObj[key] == undefined || masterObj[key] == null)
							delete masterObj[key]
					})
				}
			}

			if(masterObj){
				var columns = Object.keys(masterObj).map(function(key, i){
					var example = checkType(masterObj, key)
					var type = 'unknown';
					var schema = $scope.schema.filter(function(s){return s.className == tableId})[0]
					if(schema && schema.fields[key]){
						if(schema.fields[key].type=='GeoPoint')
							type = 'geoPoint'
						else
							type = schema.fields[key].type.toLowerCase()
					}else{
						if(key == 'createdAt' || key == 'updatedAt')
							type = 'date'
						else if(key == 'ACL')
							type = 'acl'
						else if(example.type == 'object')
							if(example.value.__type=='Date')
								type = 'date'
							else if(example.value.__type=='Pointer')
								type = 'pointer'
							else if(example.value.__type=='GeoPoint')
								type = 'geoPoint'
							else if(example.value.__type)
								type = example.value.__type
							else
								type = 'unknown'
						else
							type = example.type;
					}
					return {
						name:		key,
						type:		type,
						noEdit: 	(noEdit.indexOf(key) != -1),
						example:	example.value
					}
				})
			}
			console.log({
				masterObj: masterObj,
				colData:	columns
			})
			return {
				masterObj: masterObj,
				colData:	columns
			}
		},
		applyRules: function(){
			$scope.newData = angular.copy($scope.data);
			tools.filter.update();
			tools.order.update();
			tools.template.set($scope.insight.vis)
		},
		filter: {
			init: function(data){
				var newData = $scope.newData = angular.copy(data);
				$scope.tables = Object.keys(newData).map(function(key){
					if(!$scope.cols && newData[key])
						var cols = $scope.cols = tools.dataCols(key, newData[key]).colData;
					else
						var cols = $scope.cols;
						
					if(cols){
						return {
							name: $scope.insight.data.filter(function(table){return table.alias == key})[0]['table'],
							alias: key,
							cols: cols,
							labelCols: cols.filter(function(col){return col.type == 'number' || col.type == 'string'}),
							metricCols: cols.filter(function(col){return col.type == 'number'}),
							geoCols: cols.filter(function(col){return col.type == 'geoPoint'}),
						}
					}else{
						return {
							alias: key,
							cols: {}
						}
					}
				})
				tools.table.focus($scope.tables[0])
				if(!$scope.graph){
					$scope.graph = {
						metric: 	$scope.tables[0].metricCols[0].name,
						label:		$scope.tables[0].labelCols[0].name
					}
				}
			},
			update: function(){
				var filterOptions = {
					date: function(col, data){
						if(col.filter.start)
							data = data.filter(function(item){
								if(item[col.name]){
									var iso = item[col.name].iso || item[col.name]
									return moment(col.filter.start).diff(moment(iso)) < 0
								}else{
									return false;
								}
							})
						if(col.filter.end)
							data = data.filter(function(item){
								if(item[col.name]){
									var iso = item[col.name].iso || item[col.name]
									return moment(col.filter.end).diff(moment(iso)) > 0
								}else{
									return false;
								}
							})
						return data;
					},
					number: function(col, data){
						if(col.filter.min)
							data = data.filter(function(item){
								return item[col.name] >= col.filter.min
							})
						if(col.filter.max)
							data = data.filter(function(item){
								return item[col.name] <= col.filter.max
							})
						if(col.filter && col.filter.options)
							data = data.filter(function(item){
								var found = false;
								col.filter.options.forEach(function(option){
									if(item[col.name] == option)
										found = true;
								})
								return found;
							})
						return data;
					},
					string: function(col, data){
						if(col.filter && col.filter.string)
							data = data.filter(function(item){
								return item[col.name].toUpperCase().indexOf(col.filter.string.toUpperCase()) != -1
							})
						if(col.filter && col.filter.options)
							data = data.filter(function(item){
								var found = false;
								col.filter.options.forEach(function(option){
									if(item[col.name] == option)
										found = true;
								})
								return found;
							})
						return data;
					}
				}
				var newData = $scope.newData;
				$scope.tables.forEach(function(table){
					table.cols.forEach(function(col){
						if(col.filter){
							newData[table.alias] = filterOptions[col.type](col, newData[table.alias])
						}
					})
				})
				$scope.newData = newData;
			}
		},
		order: {
			update: function(){
				var newData = $scope.newData;
				$scope.tables.forEach(function(table){
					table.cols.forEach(function(col){
						if(col.order){
							var sortAsc = col.order == 'asc';
							var sortCol = col.name;
							var sortOptions = {
					date: function(a,b){
						if(sortAsc)
							if(new Date(a[sortCol].iso) > new Date(b[sortCol].iso))
								return 1;
							else
								return -1;
						else
							if(new Date(a[sortCol].iso) > new Date(b[sortCol].iso))
								return -1;
							else
								return 1;
					},
					number: function(a,b){
						if(sortAsc)
							if(a[sortCol] > b[sortCol])
								return 1
							else if(a[sortCol] < b[sortCol])
								return -1
							else
								return 0
						else
							if(a[sortCol] < b[sortCol])
								return 1
							else if(a[sortCol] > b[sortCol])
								return -1
							else
								return 0
					},
					default: function(a,b){
						if(sortAsc)
							if(a[sortCol].toUpperCase() > b[sortCol].toUpperCase())
								return 1
							else if(a[sortCol].toUpperCase() < b[sortCol].toUpperCase())
								return -1
							else
								return 0
						else
							if(a[sortCol].toUpperCase() < b[sortCol].toUpperCase())
								return 1
							else if(a[sortCol].toUpperCase() > b[sortCol].toUpperCase())
								return -1
							else
								return 0
					}
				}
							var fun = sortOptions.default;
							Object.keys(sortOptions).forEach(function(key){
								if(col.type == key)
									fun = sortOptions[key]
							})
							newData[table.alias] = newData[table.alias].sort(fun);
						}
					})
				})
				$scope.newData = newData;
			}
		},
		data: {
			init: function(request){
				var deferred = $q.defer();
				tools.data.get(request).then(function(list){
					$scope.data[request.alias] = angular.copy(list);
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
			},
			// add: function(){
			// 	toastr.info('Adding Table')
			// 	if($scope.temp && $scope.temp.table){
			// 		var toAdd = {
			// 			table: $scope.temp.table,
			// 			alias: $scope.temp.alias || $scope.temp.table
			// 		}
			// 		if($scope.insight.data.find(function(t){return t.alias == toAdd.alias})){
			// 			toastr.error('All table alias must be unique.')
			// 		}else{
			// 			$scope.insight.data.push(toAdd)
			// 			delete $scope.temp.table
			// 			delete $scope.temp.alias
			// 			tools.preview();
			// 		}
			// 	}else{
			// 		toastr.error('You must specify a table to add.')
			// 	}
			// }
		},
		template: {
			list: function(){
				return Object.keys(templateLibrary)
			},
			set: function(vis){
				if(vis){
					templateLibrary[vis]($scope.newData)
					$scope.insight.vis = vis;
					$scope.insight.template = vis+'.vis'
				}
			}
		},
		table: {
			focus: function(table){
				$scope.focusTable = table
				if(!$scope.forms)
					Forms.query('?where={"name":"'+table.name+'"}').then(function(list){
						$scope.forms = list;
					})
			}
		},
		col: {
			focus: function(col){
				$scope.focusCol = col;
				var datalist = $scope.data[$scope.focusTable.alias]
					datalist = datalist.flat($scope.focusCol.name);
				$scope.focusCol.options = datalist.unique();
			},
			options: function(){
				if($scope.focusCol)
					return $scope.focusCol.type + '.colOptions'
				else
					return 'default.colOptions'
			},
			style: function(col){
				if(col.filter){
					return 'background: #FF0;'
				}
			},
			clearFilter: function(col){
				delete col.filter;
				tools.applyRules()
			},
			clearOrder: function(col){
				delete col.order;
				tools.applyRules()
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
	it.InsightCtrl = $scope;
});