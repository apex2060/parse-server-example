app.lazy.controller('AdminDataCtrl', function($rootScope, $scope, $routeParams, $http, $q, config, SpreadSheet, Data, Auth){
		var data = $scope.data = {};
		var temp = $scope.temp = {};
		if($routeParams.id)
			$scope.parseTableName = $routeParams.id;
		if($routeParams.ss)
			$scope.spreadsheetId = $routeParams.ss;

		var DataSheet 	= new SpreadSheet();
		var ParseTable 	= null;
		
		$scope.privateCols = ['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'objectId'];
		$scope.moment = moment;
		
		var tools = $scope.tools = {
			init: function(){
				Auth.init().then(function(){
					tools.parseTable.init();
					if($scope.spreadsheetId)
						tools.ssTable.load($scope.spreadsheetId);
					if($scope.parseTableName)
						tools.parseTable.load($scope.parseTableName);
				})
			},
			ssTable: {
				load: function(id){
					DataSheet.load(id).then(function(ss){
						$scope.ssCols 		= DataSheet.columns();
						$scope.ssTable 		= DataSheet.toTable();
						$scope.ssJson 		= DataSheet.toJson();
					})
				},
				col: {
					focus: function(ssCol){
						$scope.temp.col = ssCol;
					},
					remove: function(col){
						var i = $scope.parseCols.indexOf(col);
						$scope.privateCols.push(col.key);
						$scope.parseCols.splice(i,1)
						$scope.mapCols.splice(i,1)
					},
					undoRemove: function(){
						
					},
					set: function(parseCol, ssCol, name){
						console.log(parseCol, ssCol, name)
						if(!ssCol){
							tools.ssTable.col.remove(parseCol)
						}else if(parseCol == 'new'){
							var i = $scope.parseCols.length;
							var cell = $scope.ssJson[0][ssCol];
							//Check for numbers disguised as a string.
							// if(!isNaN(cell.replace(/\W/g, '')))
							// 	cell = cell.replace(/\W/g, '');
							if(!name)
								name = ssCol;
							$scope.parseCols.push(tools.data.type(name, cell));
						}else{
							var i = $scope.parseCols.indexOf(parseCol);
						}
						if(ssCol){
							$scope.mapCols[i] = ssCol;
							$scope.temp.col = null;
							tools.ssTable.setTable();
						}else if(parseCol != 'new'){
							tools.ssTable.setTable();
						}
					},
					style: function(col){
						if($scope.temp.col && $scope.temp.col.key == col)
							return 'list-group-item-success'
					},
					margeAll: function(){
						var ssCols = $scope.ssCols;
						var parseCols = $scope.parseCols;
						var col = 'new';
						for(var i=0; i<ssCols.length; i++){
							for(var ii=0; ii<parseCols.length; ii++){
								if(parseCols[ii].key == ssCols[i]){
									col = parseCols[ii]
								}
							}
							tools.ssTable.col.set(col, ssCols[i])
						}
					}
				},
				row: {
					remove: function(row){
						var i = $scope.mapTable.indexOf(row)
						if(confirm('Are you sure you want to remove this row?')){
							$scope.mapTable.splice(i,1);
						}
					}
				},
				setTable: function(){
					var ssJson = $scope.ssJson;
					var mapCols = $scope.mapCols;
					var parseCols = $scope.parseCols;
					var mapTable = [];
					for(var i=0; i<ssJson.length; i++){
						var row = {};
						for(var ii=0; ii<parseCols.length; ii++){
							if(parseCols[ii] && mapCols[ii])
								row[parseCols[ii].key] = tools.data.validate(parseCols[ii], ssJson[i][mapCols[ii]], true);
						}
						mapTable.push(row);
					}
					$scope.mapTable = mapTable;
				}
			},
			parseTable: {
				init: function(){
					$scope.parseTable 	= [];
					$scope.parseCols 	= [];
					$scope.mapTable 	= [];
					$scope.mapCols 		= [];
				},
				load: function(tableName){
					ParseTable = Data(tableName);
					ParseTable.tools.list().then(function(data){
						tools.parseTable.format(data);
					})
				},
				format: function(data){
					if(data.length){
						$scope.parseTable 	= data;
						$scope.parseCols 	= tools.parseTable.columns(data);
						$scope.mapTable 	= [];
						$scope.mapCols 		= new Array($scope.parseCols.length);
					}
				},
				colStyle: function(){
					if(!$scope.temp.col)
						return 'cursor: not-allowed;';
					else
						return 'cursor:copy;';
				},
				columns: function(jsonData){
					var cols = [];
					var r = jsonData.length;
					if(r > 10);
						r=10
						
					var keys = Object.keys(jsonData[0])
					for(var i=1; i<jsonData.length; i++)
						keys = keys.concat(Object.keys(jsonData[i])).getUnique()

					//Filter out server created items
					var pCols = $scope.privateCols;
					keys = keys.filter(function(item) {
						return pCols.indexOf(item) === -1;
					});


					for(var i=0; i<keys.length; i++)
						for(var ii=0; ii<r; ii++)
							if(!cols[i] || !cols[i].type)
								if(jsonData[ii])
									cols[i] = tools.data.type(keys[i], jsonData[ii][keys[i]])
								else
									cols[i] = i
					return cols;
				},
			},
			row: {
				focus: function(index){
					$scope.current = DataSheet.toJson(index)
				},
				notifyIn: function(index){
					if($scope.json){
						var row 			= $scope.json[index];
						var expires 		= row[data.expires];
						var notifyBefore	= row[data.notifyBefore];
						var expDate 		= moment(expires);
						var today 			= moment();
						var a 				= expDate.diff(today, 'days');
						return a;
					}
				},
				eminate: function(index){
					if($scope.json){
						var row 			= $scope.json[index];
						var expires 		= row[data.expires];
						var notifyBefore	= row[data.notifyBefore];
						var expDate 		= moment(expires);
						var today 			= moment();
						var a 				= expDate.diff(today, 'days');
						if(a > 0 && a < 7)
							return 'danger';
					}
				}
			},
			data: {
				type: function(key, cell){
					//See main/modules/admin/tables/dataInputPartials/{type}.html
					if(cell != null){
						if(cell.__type == 'Pointer'){
							return {
								key: key,
								type: 'pointer',
								className: cell.className
							}
						}else if(cell.__type == 'GeoPoint'){
							return {
								key: key,
								type: 'geoPoint'
							}
						}else if(cell === true || cell === false){
							return {
								key: key,
								type: 'boolean'
							}
						}else if(Array.isArray(cell)){
							return {
								key: key,
								type: 'array'
							}	
						}else if(typeof cell == 'string' && cell.length>0){
							if(cell.toLowerCase() == 'true' || cell.toLowerCase() == 'false')
								return {
									key: key,
									type: 'boolean'
								}
							else if(cell.match('^#(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$') || key.toLowerCase().indexOf('color')>-1){
								return {
									key: key,
									type: 'color'
								}
							}else if(cell.match('^[0-9]{3}-[0-9]{3}-[0-9]{4}$') || key.toLowerCase().indexOf('phone')>-1){
								return {
									key: key,
									type: 'phone'
								}
							}else if(cell.match('^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$') || key.toLowerCase().indexOf('url')>-1){
								return {
									key: key,
									type: 'url'
								}
							}else if(cell.match('^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$') || key.toLowerCase().indexOf('email')>-1){
								return {
									key: key,
									type: 'email'
								}
							}else if(!isNaN(cell)){
								return {
									key: key,
									type: 'number'
								}
							}else if(Date.parse(cell)){
								return {
									key: key,
									type: 'date'
								}
							}else{
								return {
									key: key,
									type: 'string'
								}
							}
						}else if(!isNaN(cell)){
							return {
								key: key,
								type: 'number'
							}
						}else if(cell.__type){
							return {
								key: key,
								type: cell.__type
							}
						}else{
							return {
								key: key,
								type: typeof(cell)
							}
						}
					}
				},
				validate: function(col, cell, readable){
					if(col.type == 'number'){
						if(typeof(cell)=='number')
							return cell
						else if(typeof(cell)=='string'){
							cell = cell.replace(/[^0-9.]/g, "");
							if(!isNaN(cell))
								return Number(cell);
							else
								$rootScope.tools.alert.add('success', cell + 'is not a number!', 5)
						}else{
							$rootScope.tools.alert.add('success', cell + 'is not a number!', 5)
						}
					}else if(col.type == 'date'){
						if(readable){
							return new Date(cell)
						}else{
							return moment(cell).toISOString();
						}
					}else if(col.type=='pointer'){
						if(readable){
							var response = null;
							try{
								response = JSON.parse(cell).objectId
							}catch(e){
								response = cell
							}
							return response;
						}else{
							if(typeof(cell)=='string'){
								return {
									"__type":"Pointer",
									"className":col.className,
									"objectId":cell
								};
							}
						}
					}else{
						return cell;
					}
				},
				upload: function(cols, data){
					data = angular.copy(data);
					for(var i=0; i<data.length; i++)
						for(var ii=0; ii<cols.length; ii++)
							data[i][cols[ii].key] = tools.data.validate(cols[ii], data[i][cols[ii].key])
							
					for(var i=0; i<data.length; i++)
						ParseTable.tools.save(data[i]).then(function(response){
							console.log(response);
							$rootScope.tools.alert.add('success', 'Row saved with id of: '+response.objectId, 5)
						})
				}
			}
		};
		
		tools.init();
		it.AdminDataCtrl = $scope;
});