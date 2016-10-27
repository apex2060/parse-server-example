app.lazy.controller('AdminTableCtrl', function($scope, $routeParams, $interpolate, $compile, $timeout, $http, $sce, NgMap, Auth, Parse){
	var Forms = new Parse('Forms');
	$scope.rp = $routeParams;
	if($routeParams.id){
		var tableId = $routeParams.id
		var Data = new Parse(tableId)
	}
	
	var tableColumns = localStorage.getItem('tableColumns') || '{}'
	tableColumns = angular.fromJson(tableColumns);
	
	var colTemplates 	= $scope.colTemplates 	= [{
		title: 		'Text',
		name: 		'text',
		dataType: 	'String'
	},{
		title: 		'Date 1',
		name: 		'rDate',
		dataType: 	'Date'
	},{
		title: 		'Date 2',
		name: 		'cDate',
		dataType: 	'Date'
	},{
		title: 		'Date 3',
		name: 		'aDate',
		dataType: 	'Date'
	},{
		title: 		'Signature',
		name: 		'signature',
		dataType: 	'Object'
	},{
		title: 		'Pointer',
		name: 		'pointer',
		dataType: 	'Pointer'
	},{
		title: 		'Number',
		name: 		'number',
		dataType: 	'Number'
	},{
		title: 		'Object',
		name: 		'object',
		dataType: 	'Object'
	},{
		title: 		'Link',
		name: 		'link',
		link: 		'https://www.google.com/#q={columnName}'
	}]
	var mergeTypes 		= $scope.mergeTypes 	= ['table','file','plain']
	
	Auth.init().then(function(){
		Parse.prototype.schema().then(function(schema){
			$scope.schema = schema.filter(function(s){return s.className == tableId})[0]
			tools.init();
		})
	})
	
	var tools = $scope.tools = {
		view: function(){
			var a = 'list'
			if($routeParams.id)
				a = 'details'
			return 'modules/admin/tables/'+a+'.html';
		},
		init: function(){
			// tools.grid();
			if(tableId){
				Forms.query('?where={"name":"'+tableId+'"}').then(function(list){
					$scope.forms = list;
					tools.table.init();
				})
			}else{
				Parse.prototype.schema().then(function(schema){
					$scope.schema = schema
				})
			}
		},
		grid: function(){
			// var columns = [
			//     {id: "title", name: "Title", field: "title"},
			//     {id: "duration", name: "Duration", field: "duration"},
			//     {id: "%", name: "% Complete", field: "percentComplete", sortable:true},
			//     {id: "start", name: "Start", field: "start"},
			//     {id: "finish", name: "Finish", field: "finish"},
			//     {id: "effort-driven", name: "Effort Driven", field: "effortDriven"}
			//   ];
			//   var options = {
			//     enableCellNavigation: true,
			//     enableColumnReorder: false
			//   };
			  
			    // var data = [];
			    // for (var i = 0; i < 500; i++) {
			    //   data[i] = {
			    //     title: "Task " + i,
			    //     duration: "5 days",
			    //     percentComplete: Math.round(Math.random() * 100),
			    //     start: "01/01/2009",
			    //     finish: "01/05/2009",
			    //     effortDriven: (i % 5 == 0)
			    //   };
			    // }
			    
			//     $scope.grid = {
			//     	columns: columns,
			//     	options: options,
			//     	data: data
			//     }
			  
		},
		row: {
			save: function(n){
				var item = $scope.grid.api.getDataItem(n);
				delete item._dirty
				$scope.grid.api.updateRow(item);
				console.log(item);
				Data.save(item).then(function(s){
					$scope.notify('success','Item Saved!');
				}, function(e){
					$scope.notify('error', e.error);
				})
			},
			remove: function(n){
				var item = $scope.grid.api.getDataItem(n);
				if(confirm('Are you sure you want to delete this?'))
					if(!item.objectId)
						$scope.grid.api.invalidateRow(n)
					else
						Data.delete(item).then(function(){
							$scope.grid.api.invalidateRow(n)
						}, function(e){
							$scope.notify('error', 'Error removing item')
						})
			},
			form: function(n){
				var item = $scope.grid.api.getDataItem(n);
				$scope.focus = item;
				$('#formModal').modal('show')
				// show modal to open with a form.
			}
		},
		data: {
			save: function(){
				if($scope.grid.changed.length)
					$timeout(function(){
						var items = $scope.grid.changed.splice(0, 50);
							items = items.map(function(item){delete item._dirty; return item})
						Data.batch(items).then(function(){
							$scope.notify('info', 'Items Saved. '+$scope.grid.changed.length+' items remaining.')
							tools.data.save()
						}, function(e){
							$scope.notify('error', e.error)
							tools.data.save();
						})
					}, 500)
				else
					$scope.notify('success', 'Everything saved.')
			}
		},
		table: {
			init: function(oList){
				if(!oList)
					oList = [];
				var columns = {};
				Data.query('?limit=1000&skip='+oList.length).then(function(list){
					oList = oList.concat(list)
					if(list.length == 1000){
						tools.table.init(oList);
					}else{
						$scope.columns 	= tools.table.columns(oList);
						$scope.list 	= oList;
						tools.table.setup($scope.columns, $scope.list);
					}
				})
			},
			setup: function(columns, data){
				columns = angular.copy(columns);
				columns.push({
					id: 'options',
					name: 'Options',
					formatter: function(r,c,v,cd,dc){
						var html = ''
						if(dc._dirty)
							html += '<button class="btn btn-success btn-xs" type="button" ng-click="tools.row.save('+r+')"><i class="fa fa-check"></i></button>'
							html += '<button class="btn btn-info btn-xs" type="button" ng-click="tools.row.form('+r+')"><i class="fa fa-file-text"></i></button>'
							html += '<button class="btn btn-danger btn-xs" type="button" ng-click="tools.row.remove('+r+')"><i class="fa fa-trash"></i></button>'
						return html
					},
					asyncPostRender: function(cellNode, row, dataContext, colDef){
						var scope = angular.extend($scope, {data:dataContext})
						var interpolated = $interpolate($(cellNode).html())(scope);
						var linker = $compile(interpolated);
						var htmlElements = linker(scope);
						$(cellNode).empty()
						$(cellNode).append(htmlElements);
					}
				})
				if(!$scope.grid)
					$scope.grid = {options: {
						editable: 				true,
						enableCellNavigation: 	true,
						asyncEditorLoading: 	true,
						enableAsyncPostRender: 	true,
						autoEdit:				false,
						fullWidthRows:			true
					}};
				$scope.grid.columns = columns
				$scope.grid.data = data
				$scope.grid.ready = function(grid){
					$scope.grid.api.onSort.subscribe(function(e, args) {
						var sortAsc = args.sortAsc;
						var sortCol = args.sortCol.name;
						var Sort = {
							date: function(a,b){
								var a1 = a[sortCol];
								var b1 = b[sortCol];
								
								if(a1 == undefined)
									return 1;
								else if(b1 == undefined)
									return -1;
								else
									a1 = a1.iso || a1;
									b1 = b1.iso || b1;
									if(sortAsc)
										if(new Date(a1) < new Date(b1))
											return 1;
										else
											return -1;
									else
										if(new Date(a1) > new Date(b1))
											return 1;
										else
											return -1;
							},
							number: function(a,b){
								var a1 = a[sortCol];
								var b1 = b[sortCol];
								if(a1 == undefined)
									return 1;
								else if(b1 == undefined)
									return -1;
								else
									if(sortAsc)
										if(a1 > b1)
											return 1
										else if(a1 < b1)
											return -1
										else
											return 0
									else
										if(a1 < b1)
											return 1
										else if(a1 > b1)
											return -1
										else
											return 0
							},
							default: function(a,b){
								var a1 = a[sortCol];
								var b1 = b[sortCol];
								if(a1 == undefined)
									return 1;
								else if(b1 == undefined)
									return -1;
								else{
									if(!isNaN(a1) && !isNaN(b1))
										if(sortAsc)
											if(parseInt(a1, 10) > parseInt(b1, 10))
												return 1
											else if(parseInt(a1, 10) < parseInt(b1, 10))
												return -1
											else
												return 0
										else
											if(parseInt(a1, 10) < parseInt(b1, 10))
												return 1
											else if(parseInt(a1, 10) > parseInt(b1, 10))
												return -1
											else
												return 0
									else
										if(sortAsc)
											if(a1.toUpperCase() > b1.toUpperCase())
												return 1
											else if(a1.toUpperCase() < b1.toUpperCase())
												return -1
											else
												return 0
										else
											if(a1.toUpperCase() < b1.toUpperCase())
												return 1
											else if(a1.toUpperCase() > b1.toUpperCase())
												return -1
											else
												return 0
								}
							}
						}

						var fun = Sort.default;
						var colData = $scope.colData.find(function(col){return col.name == sortCol})
						Object.keys(Sort).forEach(function(key){
							if(colData.type == key)
								fun = Sort[key]
						})
						
							
						$scope.grid.data = $scope.grid.data.sort(fun)
						$scope.grid.api.invalidateAllRows();
						$scope.grid.api.render();
					});
					$scope.grid.api.onKeyDown.subscribe(function(e,c) {
						if(!$scope.grid.key)
							$scope.grid.key = {}
						var pv = $scope.grid.key.previous;
						var cv = e.keyCode;
						if(pv == 17 && cv == 67){ //ctrl + c
							var cols = $scope.grid.api.getColumns().map(function(col){return col.name})
							$scope.grid.key.value =  $scope.grid.data[c.row][cols[c.cell]];
						}
						else if(pv == 17 && cv == 86){ //ctrl + c
							$scope.grid.api.invalidateRow(c.row);
							var cols = $scope.grid.api.getColumns().map(function(col){return col.name})
							$scope.grid.data[c.row][cols[c.cell]] = $scope.grid.key.value
							$scope.grid.data[c.row]._dirty = true;
							$scope.grid.api.render();
						}
						
						$scope.grid.key.previous = e.keyCode
					});
				}
			},
			dataCols: function(list){
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
						if($scope.schema && $scope.schema.fields[key]){
							if($scope.schema.fields[key].type=='GeoPoint')
								type = 'geoPoint'
							else
								type = $scope.schema.fields[key].type.toLowerCase()
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
				
				return {
					masterObj: masterObj,
					colData:	columns
				}
			},
			columns: function(list){
				var notAllowed = ['$$hashKey','_dirty']
				var Editor = {
					_default: {
						destroy: function(){},
						isValueChanged: function(){return false;},
						serializeValue: function(){return "";},
						focus: function(){},
						setValue: function(val){},
						validate: function() {
							return {valid:true, msg:null}
						},
						applyValue: function (item, state) {}
					},
					Obj: function(args){
						var display;
						var scope = this;
						
						this.destroy		= Editor._default.destroy;
						this.isValueChanged = Editor._default.isValueChanged;
						this.serializeValue = Editor._default.serializeValue;
						this.focus			= Editor._default.focus;
						this.setValue		= Editor._default.setValue;
						
						
						this.init = function(){
							display = $("<span>Editing</span>").appendTo(args.container);
							$('#ObjModal').modal('show')
						}
				
						this.loadValue = function(items) {
							var items = items[args.column.field]
							if(!items)
								$scope.focus = {list:[], columns:[]}
							else if(items.length)
								$scope.focus = {
									list:		items,
									columns:	Object.keys(items[0])
								}
							else
								$scope.focus = {
									list:		[items],
									columns:	Object.keys(items)
								}
							$scope.$apply();
						};
						scope.init();
					},
					Acl: function(args){
						var display, origValue, newValue, open;
						var scope = this;
						
						this.destroy		= Editor._default.destroy;
						this.focus			= Editor._default.focus;
						
						this.init = function(){
							display = $("<span>Editing</span>").appendTo(args.container);
						}
						this.loadValue = function(items) {
							var acl = angular.copy(items[args.column.field])
							origValue = angular.copy(acl)
							acl = {ACL: acl || {}}
							if(!open){
								open = true;
								Forms.ACL.modal(acl, 'Data Permissions.').then(function(response){
									newValue = response.ACL
								})
								$scope.$apply();
							}
						}
						this.setValue = function() {
							return newValue || origValue;
						};
						this.serializeValue = function() {
							return newValue || origValue;
						};
						this.getValue = function() {
							return newValue || origValue;
						};
						this.isValueChanged = function() {
							function order(obj) {
								if(obj){
									var keys = Object.keys(obj).sort(function keyOrder(k1, k2) {
										if (k1 < k2) return -1;
										else if (k1 > k2) return +1;
										else return 0;
									});
								
									var i, after = {};
									for (i = 0; i < keys.length; i++) {
										after[keys[i]] = obj[keys[i]];
										delete obj[keys[i]];
									}
								
									for (i = 0; i < keys.length; i++) {
										obj[keys[i]] = after[keys[i]];
									}
								}
								return obj;
							}
							if(origValue && !origValue['*'])
								origValue['*'] = {};
							if(!origValue)
								return true;
							else
								return angular.toJson(order(origValue)) != angular.toJson(order(newValue))
						};
						this.validate = function() {
							return {valid:true, msg:null}
						};
						this.applyValue = function (item, state) {
							item[args.column.field] = state;
						};
						scope.init();
					},
					Ptr: function(args){
						var display;
						var scope = this;
						
						this.destroy		= Editor._default.destroy;
						this.isValueChanged = Editor._default.isValueChanged;
						this.serializeValue = Editor._default.serializeValue;
						this.focus			= Editor._default.focus;
						this.setValue		= Editor._default.setValue;
						
						
						this.init = function(){
							display = $("<span>Editing</span>").appendTo(args.container);
							$('#PtrModal').modal('show')
						}
				
						this.loadValue = function(items) {
							var items = items[args.column.field]
							// Load other options...
							if(!$scope.related)
								$scope.related = {}
							if(!$scope.related[items.className]){
								$scope.related[items.className] = {table: items.className}
								var Forms = new Parse('Forms');
								Forms.query('?where={"name":"' + items.className + '"}').then(function(forms) {
									$scope.related[items.className].forms = forms
								})
							}
							
							if(items.length){
								//then there is an array of pointers...
								//we need to know which one they are interested in...
								$scope.focus = {
									list:		[items],
									columns:	Object.keys(items)
								}
							}else{
								//there is only one pointer.
								var Ref = new Parse(items.className);
								Ref.get(items.objectId).then(function(item){
									$scope.related[items.className].item = item;
									$scope.related[items.className].list = [item]
									$scope.related[items.className].columns = Object.keys(item)
									$scope.focus = $scope.related[items.className]
								})
							}
							$scope.$apply();
						};
						scope.init();
					},
					Geo: function(args){
						var display, origValue, newValue;
						var scope = this;
						
						this.destroy		= Editor._default.destroy;
						this.focus			= Editor._default.focus;
						this.setValue		= Editor._default.setValue;
						
						this.init = function(){
							display = $('<span>Editing</span>').appendTo(args.container);
							$('#GeoModal').modal('show')
						}
				
						this.loadValue = function(items) {
							var origValue = items[args.column.field] || {}
							
							$scope.focusCallback = function(){
								var pos = this.getPosition();
								newValue = $scope.focus = {
									latitude: pos.lat(),
									longitude: pos.lng(),
									__type: 'GeoPoint'
								}
								display.html(newValue.latitude+', '+newValue.longitude)
							}
							$scope.$apply();
							
							if(origValue.latitude){
								display.html(origValue.latitude+', '+origValue.longitude)
								$scope.focus = origValue
								$timeout(function(){
									NgMap.initMap('GeoMap');
								}, 1000)
							}else{
								navigator.geolocation.getCurrentPosition(function(position){
									$scope.focus = {
										latitude:	position.coords.latitude,
										longitude:	position.coords.longitude,
										__type: 	'GeoPoint'
									}
									$timeout(function(){
										NgMap.initMap('GeoMap');
									}, 1000)
								});
							}
						};
						
						this.serializeValue = function() {
							return newValue || origValue;
						};
						this.getValue = function() {
							return newValue || origValue;
						};
						this.isValueChanged = function() {
							if(!origValue)
								return true;
							else if(newValue)
								return (origValue.latitude != newValue.latitude && origValue.longitude != newValue.longitude)
							else
								return false;
						};
						this.validate = function() {
							return {valid:true, msg:null}
						};
						this.applyValue = function (item, state) {
							item[args.column.field] = state;
						};
						scope.init();
					},
					Date: function(args){
						var $input;
						var defaultValue;
						var scope = this;
					
						this.init = function() {
							$input = $('<input type="date" class="editor-text">');
					
							$input.bind("keydown.nav", function(e) {
								if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
									e.stopImmediatePropagation();
								}
							});
					
							$input.appendTo(args.container);
							$input.focus().select();
						};
					
						this.destroy = function() {
							$input.remove();
						};
					
						this.focus = function() {
							$input.focus();
						};
					
						this.loadValue = function(item) {
							defaultValue = item[args.column.field].iso;
							$input.val(moment(defaultValue).format('YYYY-MM-DD'))
							$input[0].defaultValue = defaultValue;
							$input.select();
						};
					
						this.serializeValue = function() {
							return {
								__type: "Date",
								iso:	moment($input.val()).toISOString()
							}
						};
					
						this.applyValue = function(item, state) {
							console.log(state)
							item[args.column.field] = state;
						};
					
						this.isValueChanged = function() {
							return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
						};
					
						this.validate = function() {
							return {
								valid: true,
								msg: null
							};
						};
					
						this.init();
					}
				}
				var Format = {
					Ptr: function(r, c, v, cd, dc){
						if(v)
							return v.className+' ('+v.objectId+')'
						else
							return ''
					},
					Geo: function(r, c, v, cd, dc){
						if(v)
							return v.latitude+', '+v.longitude
						else
							return ''
					},
					Date: function(r, c, v, cd, dc){
						if(v)
							return moment(v.iso).calendar()
						else
							return ''
					},
					Obj: function(r, c, v, cd, dc){
						if(v)
							return JSON.stringify(v)
						else
							return ''
					}
				}

				var analyzed = tools.table.dataCols(list);
				$scope.masterObj = analyzed.masterObj;
				$scope.colData = analyzed.colData;
				if($scope.colData)
					var columns = $scope.colData.map(function(col, i){
						if(col.noEdit)
							return {id:i,field:col.name,name:col.name,editor:null, sortable:true}
						else if(col.type == 'string')
							return {id:i,field:col.name,name:col.name,editor:Slick.Editors.Text, sortable:true}
						else if(col.type == 'number')
							return {id:i,field:col.name,name:col.name,editor:Slick.Editors.Integer, sortable:true}
						else if(col.type == 'boolean')
							return {id:i,field:col.name,name:col.name,editor:Slick.Editors.Checkbox}
						else if(col.type == 'acl')
							return {id:i,field:col.name,name:col.name,editor:Editor.Acl}
						else if(col.type == 'date')
							return {id:i,field:col.name,name:col.name,editor:Editor.Date, formatter:Format.Date, sortable:true}
						else if(col.type == 'pointer')
							return {id:i,field:col.name,name:col.name,editor:Editor.Ptr,formatter:Format.Ptr}
						else if(col.type == 'geoPoint')
							return {id:i,field:col.name,name:col.name,editor:Editor.Geo,formatter:Format.Geo}
						else
							return {id:i,field:col.name,name:col.name,editor:Editor.Obj,formatter:Format.Obj}
					}).filter(function(col){
						if(!col)
							return false;
						
						return notAllowed.indexOf(col.name) == -1
					})
				else
					var columns = [];
				return columns
			},
			search: function(listSearch){
				listSearch = listSearch.toLowerCase()
				var list = $scope.list.filter(function(row){
					return JSON.stringify(row).toLowerCase().indexOf(listSearch) != -1;
				})
				var columns 	= tools.table.columns(list);
				tools.table.setup(columns, list)
			},
			reset: function(){
				tableColumns[tableId] = false;
				$scope.columns = tools.table.columns($scope.list);
			},
			migrate: function(settings){
				var NewData = new Parse(settings.name);
				var status = 0;
				for(var i=0; i<$scope.list.length; i++)
					(function(item){
						item = angular.copy(item);
						var oldId = item.objectId;
						delete item.objectId;
						delete item.createdAt;
						delete item.updatedAt;
						NewData.save(item).then(function(result){
							toastr.success(oldId+' coppied to: '+settings.name+' as: '+result.objectId)
							$scope.migrationStatus = ++status/$scope.list.length*100
						})
					})($scope.list[i])
			},
			export: function(){
				var table = [];
				var cols = angular.copy($scope.columns);
					cols.unshift({name:'objectId'})
					table.push(cols.map(function(col){return col.title || col.name}))
				$scope.list.forEach(function(r){
					var row = []
					cols.forEach(function(col, i){
						var val = r[col.name]
						if(!val)
							row[i] = '(undefined)'
						else if(typeof val == 'object')
							row[i] = angular.toJson(val).replace(/\,/g,";")
						else
							row[i] = val
					})
					table.push(row)
				})
				var csvContent = "data:text/csv;charset=utf-8,";
				table.forEach(function(infoArray, index) {
					var dataString = infoArray.join(",");
					csvContent += index < table.length ? dataString + "\n" : dataString;
				});
				var link = document.createElement("a");
				if (link.download !== undefined) { // feature detection
					var url = encodeURI(csvContent);
					link.setAttribute("href", url);
					link.setAttribute("download", 'export.csv');
					link.style.visibility = 'hidden';
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
				}
			}
		},
		// column: {
		// 	focus: function(column){
		// 		//show modal to manipulate column information
		// 		if(!column.title)
		// 			column.title = column.name;
		// 		$scope.focus = column;
		// 		$('#colModal').modal('show')
		// 	},
		// 	add: function(params){
		// 		if(!params)
		// 			params = prompt('Enter Column Name (no spaces or special chars)');
		// 		if(typeof(params) == 'string')
		// 			params = {
		// 				name: params
		// 			}
		// 		$scope.columns.push(params);
		// 	},
		// 	remove: function(column){
		// 		if(confirm('Are you sure you want to remove this column?')){
		// 			var i = $scope.columns.indexOf(column);
		// 			$scope.columns.splice(i,1)
		// 		}
		// 	},
		// 	template: function(column){
		// 		if(column && column.template)
		// 			return column.template.name+'.templateCol'
		// 	}
		// },
		// cell: {
		// 	focus: function(cell){
		// 		var columns = tools.object.keys(cell);
		// 		var focus = $scope.focus = {
		// 			type: tools.object.type(cell),
		// 			columns: tools.object.keys(cell),
		// 		}
		// 		if(focus.type == 'Object')
		// 			focus.list = [cell]
		// 		else if(focus.type == 'Array')
		// 			focus.list = cell
		// 		$('#deepDive').modal('show')
		// 	},
		// 	template: function(col, row){
		// 		if(col){
		// 			if(col.name == 'objectId')
		// 				return 'noedit.templateCell'
		// 			if(col.template)
		// 				return col.template.name+'.templateCell'
		// 			else
		// 				return 'default.templateCell'
		// 		}
		// 	}
		// },
		merge: {
			init: function(){
				if(!$scope.merge)
					$scope.merge = {addNew: true};
				$('#mergeModal').modal('show')
				Parse.prototype.schema().then(function(schema){
					$scope.schema = schema
				})
			},
			loadFile: function(file){
				$scope.merge.json = file.src.csvToJson()
				tools.merge.display();
				$scope.$apply();
			},
			cast: function(col){
				var cast = prompt('To what?  text, number, date')
				$scope.merge.json = $scope.merge.json.map(function(itm){
					if(cast == 'text')
						if(itm[col] == 0)
							itm[col] = '';
						else
							itm[col] = ''+itm[col]
					else if(cast == 'number')
						itm[col] = Number(itm[col])
					else if(cast == 'date')
						itm[col] = moment(itm[col]).toDate()
					return itm
				})
			},
			display: function(){
				if($scope.merge){
					var merge = $scope.merge
					var leftCols = $scope.columns.map(function(col){return col.name;})
						leftCols.push('objectId')
					if(merge.type == 'table')
						var rightCols = Object.keys(merge.db.fields)
					if(merge.type == 'file')
						var rightCols = tools.object.keys(merge.json)
						
						leftCols 	= leftCols.filter(function(col){return col!='createdAt' && col!='updatedAt'})
						rightCols 	= rightCols.filter(function(col){return col!='createdAt' && col!='updatedAt'})
					var joinCols 	= leftCols.filter(function(col){return rightCols.indexOf(col) != -1;})
						leftCols 	= leftCols.filter(function(col){return joinCols.indexOf(col) == -1;})
						rightCols 	= rightCols.filter(function(col){return joinCols.indexOf(col) == -1;})
						joinCols 	= joinCols.map(function(col){
							return {left:col,right:col,loose:true}
						})
					$scope.merge.columns = {
						left: leftCols,
						join: joinCols,
						right: rightCols
					}
				}
			},
			rJoin: function(col){
				var cols = $scope.merge.columns;
				if(col.left)
					cols.left.push(col.left)
				if(col.right)
					cols.right.push(col.right)
				cols.join.splice(cols.join.indexOf(col), 1);
			},
			join: function(s,e){
				var mc = $scope.merge.columns;
				e = mc[s].splice(mc[s].indexOf(e), 1)[0];
				mc.join.forEach(function(col){
					if(!col[s]){
						col[s] = e;
						e = null;
					}
				})
				if(e){
					var obj = {};
					obj[s] = e;
					mc.join.push(obj);
				}
			},
			remove: function(parent, child){
				parent.splice(parent.indexOf(child), 1)
			},
			act: function(){
				var merge 	= $scope.merge;
				var left 	= $scope.list;
				var right 	= merge.json;
				var cols 	= merge.columns;
				function smash(orig, nuevo, cols){
					cols.forEach(function(col){
						orig[col] = nuevo[col]
					})
					return orig;
				}
				function join(){
					var newList = [];
					left.forEach(function(lItem, i, lArr){
						var match = right.find(function(rItem){
							var found = true;
							cols.join.forEach(function(m){
								// console.log(lItem, rItem)
								// console.log(lItem[m[0]], rItem[m[1]])
								if( (true || m.loose) && (lItem[m.left] && rItem[m.right]) ){
									if(lItem[m.left].toLowerCase().replace(/ /g, '') != rItem[m.right].toLowerCase().replace(/ /g, ''))
										found = false;
								}else{
									if(lItem[m.left] != rItem[m.right])
										found = false;
								}
							})
							return found;
						})
						if(match){
							var prod = smash({_dirty:true}, lItem, cols.join.map(function(c){return c.left}))
							prod = smash(prod, lItem, cols.left)
							prod = smash(prod, match, cols.right)
							right.splice(right.indexOf(match), 1)
							newList.push(prod);
						}else if(!merge.removeOld){
							cols.right.map(function(col){lItem[col] = lItem[col] || null})
							newList.push(lItem);
						}
					})
					if(merge.addNew){
						newList = newList.concat(right.map(function(item){
							item._dirty = true;
							cols.join.forEach(function(c){
								item[c.left] = item[c.right];
								delete item[c.right]
							})
							return item;
						}));
					}
					it.join = newList;
					return newList;
				}
				var list = join();
				tools.table.setup(tools.table.columns(list), list)
			}
		},
		object: {
			keys: function(obj){
				var keys = [];
				var length = obj.length;
					if(length > 10)
						length = 10;
						
				if(obj instanceof Array){
					for(var i=0; i<length; i++)
						keys = keys.concat(Object.keys(obj[i]))
					keys = keys.getUnique();
				}else if(obj instanceof Object){
					keys = Object.keys(obj)
				}
				return keys;
			},
			type: function(obj){
				if(obj instanceof Array)
					return 'Array'
				else if(obj instanceof Object)
					return 'Object'
				else
					return typeof(obj)
			}
		},
		random: {
			interpolate: function(template, scope){
				return $interpolate(template)(scope)
			},
			compile: function(type, col, row){
				if(type == 'link' && col.template.format && row)
					return $interpolate(col.template.format)(row)
				else if(type == 'rDate')
					return moment(row[col.name]).fromNow()
				else if(type == 'cDate')
					return moment(row[col.name]).calendar()
				else if(type == 'aDate')
					return moment(row[col.name]).format("MMM Do YYYY, h:mm:ss a");
			}
		},
		modal: function(id){
			$('#'+id).modal('show');
		}
	}
	
	it.AdminTableCtrl = $scope
});

//{{ observations | map:"location" }}