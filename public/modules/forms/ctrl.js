app.lazy.controller('AdminFormsCtrl', function($scope, $http, $timeout, $routeParams, Parse) {
	var Forms = new Parse('Forms');
	var tools = $scope.tools = {
		view: function(){
			var a = $routeParams.action || 'list';
			return 'modules/forms/'+a+'.html';
		},
		init: function(){
			tools.form.load();
		},
		focus: function(item){
			$scope.focus = item;
		},
		state: function(check){
			return $scope.state == check;
		},
		form: {
			load: function(){
				$scope.state = 'loading'
				Forms.list().then(function(list){
					$scope.forms = list;
					$scope.state = 'loaded'
				})
			},
			refresh: function(){
				$scope.state = 'refreshing'
				Forms.list().then(function(list){
					$scope.forms = list;
					$scope.state = 'loaded'
				})
			},
			delete: function(form){
				if(confirm('Are you sure you want to delete this form?'))
					Forms.delete(form).then(function(){
						var i = $scope.forms.indexOf(form)
						$scope.forms.splice(i,1)
					})
			}
		}
	}
	tools.init();
	it.AdminFormsCtrl = $scope;
});

app.lazy.controller('AdminFormsCreateCtrl', function($scope, $http, $timeout, $routeParams, Parse, Auth, Google) {
	var Forms = new Parse('Forms');
	var Users = new Parse('_User');
	var Roles = new Parse('_Role');
	
	//The following variables make it possible to work with nested input groups.
	var ePromise;
	var clicked = [];
	
	var yHistory = it.y = [];
	var zHistory = it.z = [];
	var formTemplate = {
		title: 		'Untitled Form',
		type: 		'form',
		name: 		'ud_unassigned',
		fields: 	[],
	}
	
	var fieldOptions = $scope.fieldOptions = [
		{
			title:      'Header',
			type:       'header',
			p: 			'Paragraph Text',
			files: 		[],
			enabled: 	true
		},{
			title:      'Group',
			name: 		'columnName',
			p:			'Paragraph Text',
			type:       'group',
			dataType:   'Object',
			fields: 	[],
			enabled: 	true
		},{
			title:      'Text Line',
			name: 		'columnName',
			placeholder:'',
			type:       'text',
			dataType:   'String',
			enabled: 	true
		},{
			title:      'Text Area',
			name: 		'columnName',
			placeholder:'',
			type:       'textarea',
			dataType:   'String',
			enabled: 	true
		},{
			title:      'Select Input',
			name: 		'columnName',
			type:       'select',
			dataType:   'Pointer',
			parseClass: 'unassigned',
			parseQuery: '',
			enabled: 	true
		},{
			title:      'Pointer',
			name: 		'columnName',
			placeholder:'',
			type:       'pointer',
			dataType:   'Pointer',
			enabled: 	true
		},{
			title:      'Number Input',
			name: 		'columnName',
			placeholder:'',
			type:       'number',
			dataType:   'Number',
			enabled: 	true
		},{
			title:      'Date',
			name: 		'columnName',
			placeholder:'',
			type:       'date',
			subType: 	'date',
			dataType:   'Date',
			enabled: 	true
		},{
			title:      'Check Box',
			name: 		'columnName',
			placeholder:'',
			type:       'checkbox',
			dataType:   'Boolean',
			enabled: 	true
		},{
			title:      'Geo Point',
			name: 		'columnName',
			placeholder:'',
			type:       'geoPoint',
			dataType:   'GeoPoint',
			enabled: 	true
		},{
			title:      'File Input',
			name: 		'columnName',
			type:       'file',
			dataType:   'Object',
			permissions: [],
			enabled: 	true
		},{
			title:      'Image Input',
			name: 		'columnName',
			type:       'image',
			dataType:   'Object',
			enabled: 	true
		},{
			title:      'Signature Input',
			name: 		'columnName',
			type:       'signature',
			dataType:   'Object',
			enabled: 	true
		}
	]
	var gDefault = $scope.gDefault = {
		roles: ['writer','commenter','reader'],
		types: ['user','group','domain','anyone']
	}
	var tools = $scope.tools = {
		init: function(){
			$timeout(function(){
				if($routeParams.action=='create'){
					if($routeParams.view){
						Forms.get($routeParams.view).then(function(form){
							$scope.form = angular.copy(form)
						})
					}else{
						tools.form.new();
					}
				}
			}, 1000);
			$scope.$watch('form.name', function(newValue, oldValue){
				if($scope.user && !$scope.user.is('Admin')){
					if(newValue && newValue.substring(0,3) != 'ud_')
						$scope.form.name = 'ud_'+newValue
				}
			}, true)
			tools.workflow.loadCalendars();
			tools.keyEvents();
			Parse.prototype.schema().then(function(schema){
				$scope.schema = schema
			})
		},
		keyEvents: function(){
			require(['vendor/mousetrap.js'], function(Mousetrap){
				Mousetrap.bind('ctrl+z', function(e){
					toastr.info('Undo')
					tools.item.undo();
					$scope.$apply()
				});
				Mousetrap.bind('ctrl+y', function(e){
					toastr.info('Redo')
					tools.item.redo();
					$scope.$apply()
				});
				Mousetrap.bind(['ctrl+s', 'meta+s'], function(e){
					if(e.preventDefault){e.preventDefault();}else{e.returnValue=false;}
					tools.form.save();
				});
			});
			$scope.$on('$routeChangeStart', function(next, current) {
				Mousetrap.reset();
			});
		},
		item: {
			undo: function(){
				var h = zHistory.pop()
				if(h){
					yHistory.push(h)
					h[0]()
				}
			},
			redo: function(){
				var h = yHistory.pop()
				if(h){
					zHistory.push(h)
					h[1]()
				}
			},
			add: function(parent, attr, item){
				if(!parent[attr])
					parent[attr] = []
				zHistory.push([function(){
					parent[attr].splice(parent[attr].indexOf(item), 1)
				}, function(){
					parent[attr].splice(parent[attr].indexOf(item), 0, item)
				}])
				parent[attr] = parent[attr] || [];
				parent[attr].push(item)
			},
			copy: function(parent, item){
				parent.push(angular.copy(item));
				toastr.success('Item Cloned')
			},
			remove: function(parent, item){
				var i = parent.indexOf(item)
				zHistory.push([function(){
					parent.splice(i+1, 0, item)
				}, function(){
					parent.splice(i, 1)
				}])
				parent.splice(i, 1)
			},
			focus: function(field){
				$timeout.cancel(ePromise);
				clicked.push(field);
				ePromise = $timeout(function(){
					$scope.focus = clicked[0];
					if(clicked.length >  1)
						$scope.fParent = clicked[1];
					clicked = [];
				}, 100)
			},
			addFiles: function(item){
				//update file permissions????
				item.files = item.files || [];
				var ol = angular.copy(item.files)
				Google.drive.picker.generate(10).then(function(data){
					ol = ol.concat(data.docs)
					item.files = angular.extend(item.files, ol)
				})
			},
			setSchema: function(db){
				if(db){
					db = $scope.schema.find(function(schema){
						return schema.className == db
					});
					var keys = Object.keys(db.fields)
						keys = keys.filter(function(key){
							if(['String','Number'].indexOf(db.fields[key].type) != -1)
								return true;
						})
					
					$scope.focus.options = keys;
				}
			}
		},
		form: {
			acl: function(){
				Forms.ACL.modal($scope.form, 'The sharing permissions for this form do not reflect sharing permissions of the data its self.')
			},
			new: function(){
				if(!$scope.form || confirm('Any unsaved work will be lost, do you wish to continue?')){
					$scope.form = angular.copy(formTemplate);
					$scope.fParent = $scope.form;
				}
			},
			copy: function(){
				var error = tools.form.errors($scope.form.fields)
				if(error)
					alert('You need to rename the column for: '+error.title)
				else
					Forms.save($scope.form).then(function(form){
						form = angular.copy(form);
						delete form.objectId;
						$scope.form = form;
						$scope.fParent = $scope.form;
						$scope.form.title = $scope.form.title + ' (copy)'
						toastr.success('Form Copied!')
					}, function(e){
						toastr.error(e)
					});
			},
			save: function(){
				var form = $scope.form;
				var error = tools.form.errors(form.fields)
				if(error)
					alert('You need to rename the column for: '+error.title)
				else
					Forms.save(form).then(function(form){
						$scope.form = form;
						toastr.success('Form Saved!')
					}, function(e){
						if(e && e.code == 101)
							toastr.error('It looks like you do not have permission to edit this form');
						else
							toastr.error(e);
					})
			},
			delete: function(){
				if(confirm('Are you sure you want to delete this form?')){
					Forms.delete($scope.form).then(function(form){
						tools.form.new();
						toastr.error('Form Deleted!')
					})
				}
			},
			errors: function(fields){
				for(var i=0; i<fields.length; i++){
					var f = fields[i];
					if(f.type != 'header' && (f.name == 'columnName' || f.name == '' || !f.name))
						return f;
					if(f.fields)
						return tools.form.errors(f.fields)
				}
			}
		},
		field: {
			add: function(field){
				if(!$scope.fParent)
					$scope.fParent = $scope.form;
				$scope.fParent.fields.push( angular.copy(field) );
				$scope.addField = null;
			},
			addLink: function(field){
				var link = {
					text: prompt('Enter Display Value'),
					href: prompt('Enter Link URL')
				}
				tools.item.add(field, 'links', link)
			},
			editLink: function(field, link){
				var i = field.links.indexOf(link)
				var link = {
					text: prompt('Enter Display Value'),
					href: prompt('Enter Link URL')
				}
				if(link.text && link.href)
					field.links[i] = link
			},
			removeLink: function(field, link){
				tools.item.remove(field.links, link)
			},
		},
		drag: {
			init: function(){
				$(".form-dropzone").on('dragover', function(e){
					it.e = e
				});
			},
			start: function(parent,item,event){
				tools.drag.init();
				$scope.dragItem 	= item;
				$scope.dragParent 	= parent;
			},
			stop: function(){
				$timeout(function(){
					delete $scope.dragItem;
					delete $scope.dragParent;
				}, 500)
			}
		},
		drop: {
			complete: function(parent,item,dropped){
				var di = $scope.dragItem;
				var dc = angular.copy(di)
				var dp = $scope.dragParent;
				if(dp && di!=parent){
					dp.fields.splice(dp.fields.indexOf(di), 1)
					if(item)
						var i = parent.fields.indexOf(item)+1
					else
						var i = 0;
					parent.fields.splice(i, 0, dc);
					
					
					$timeout(function(){
						$scope.focus 	= dc;
						$scope.fParent 	= parent;
					}, 150);
					
					delete $scope.dragItem;
					delete $scope.dragParent;
				}
			}
		},
		workflow:{
			loadCalendars: function(){
				Google.calendar.list('writer').then(function(calendars){
					$scope.calendars = calendars;
				})
			},
			toggle: function(action){
				action.active = !action.active;
			}
		},
		onSubmit: {
			acl: function(){
				if(!$scope.form.onSubmit)
					$scope.form.onSubmit = {ACL: {}};
				Forms.ACL.modal($scope.form.onSubmit, 'All data submitted through this form will be saved with the following rules applied.')
			}
		},
		modal: function(id){
			$('#'+id).modal('show');
		}
	}
	
	Auth.init().then(function(){
		Forms.list().then(function(list){
			$scope.forms = list;
			tools.init();
		})
		Users.list().then(function(list){
			$scope.users = list;
		})
		Roles.list().then(function(list){
			$scope.roles = list;
		})
	})
	
	it.AdminFormsCreateCtrl = $scope;
});

app.lazy.controller('AdminFormsFillCtrl', function($scope, $http, $timeout, $q, $routeParams, $interpolate, Parse, Google) {
	it.rp = $routeParams;
	var Forms = new Parse('Forms');
	var Data = null;
	$scope.data = {};
	
	var tools = $scope.tools = {
		init: function(){
			tools.setup()
			$scope.$on('$locationChangeStart', function(event) {
				tools.setup();
			});
		},
		setup: function(){
			tools.form.load().then(function(form){
				if($routeParams.for){
					Data.get($routeParams.for).then(function(data){
						$scope.data = data;
						if($routeParams.data && confirm('The link you clicked is providing data which would override some form values, would you like to use this data?'))
							$scope.data = angular.extend(data, angular.fromJson($routeParams.data))
						tools.form.import(form.fields, $scope.data).then(function(fields){
							form.fields = fields
						})
					})
				}else{
					if($routeParams.data && confirm('The link you clicked is providing data which would override some form values, would you like to use this data?'))
						$scope.data = angular.fromJson($routeParams.data)
					tools.form.import(form.fields, $scope.data).then(function(fields){
						form.fields = fields;
					})
				}
			})
		},
		form: {
			load: function(){
				var deferred = $q.defer();
				$timeout(function(){
					if($routeParams.action=='fill'){
						if($routeParams.view){
							Forms.get($routeParams.view).then(function(form){
								$scope.orig = form;
								$scope.form = angular.copy(form);
								Data = new Parse(form.name);
								deferred.resolve($scope.form);
							})
						}else{
							tools.form.new();
						}
					}
				}, 1000)
				return deferred.promise;
			},
			import: function(fields, data){
				var deferredFields = $q.defer();
				data = data || {};
				//Join data to fields to display properly.
				var arrayVarients = ['image', 'file']
				function format(field, data){
					var deferred = $q.defer();
					var format = {
						group: function(field){
							tools.form.import(field.fields, data).then(function(fields){
								field.fields = fields;
								deferred.resolve(field);
							})
							return deferred.promise;
						},
						date: function(field){
							var d = new Date()
							var m = d.getTimezoneOffset();
							if(data && data.iso)
								field.value = moment(data.iso).toDate() //.add(m, 'minutes').toDate()
							else
								field.value = moment(data).toDate() //.add(m, 'minutes').toDate()
							
							deferred.resolve(field);
							return deferred.promise;
						},
						pointer: function(field){
							field.Data = new Parse(field.ptr.database);
							var query = field.ptr.query || '';
							field.Data.query(query).then(function(list){
								field.options = list;
								if(data)
									field.value = data.objectId
								deferred.resolve(field);
							})
							return deferred.promise;
						},
						geoPoint: function(field){
							if(data){
								field.value = [data.latitude, data.longitude]
								deferred.resolve(field);
							}else{
								navigator.geolocation.getCurrentPosition(function(position){
									field.value = [position.coords.latitude, position.coords.longitude]
									deferred.resolve(field);
								});
							}
							return deferred.promise;
						}
					}
					var formatOptions = Object.keys(format);
					if(formatOptions.indexOf(field.type) != -1){
						return format[field.type](field)
					}else{
						field.value = data;
						deferred.resolve(field);
						return deferred.promise;
					}
				}
				if(!fields)
					deferredFields.resolve([]);
				else{
					var promises = [];
					for(var i=0; i<fields.length; i++){
						promises.push((function(field, i){
							var deferred = $q.defer();
							field.data = data; //Allows us to refer to row data within the parsed text.
							
							if(arrayVarients.indexOf(field.type) != -1){
								field.varientArray = true;
								field.array = false;
							}
								
							if(field.array){
								var arr = data[field.name];
								var promises = [];
								if(arr){
									for(var i=0; i<arr.length; i++)
										promises.push((function(field, data){
											var f = angular.copy(field);
											delete f.array;
											var formated = format(f, data);
											return formated;
										})(field, arr[i]))
									$q.all(promises).then(function(values){
										field.value = values;
										deferred.resolve(field);
									})
								}else{
									field.value = [];
									deferred.resolve(field);
								}
								return deferred.promise;
							}else{
								return format(field, data[field.name])
							}
						})(fields[i], i))
					}
					$q.all(promises).then(function(fields){
						deferredFields.resolve(fields);
					})
				}
				return deferredFields.promise;
			},
			export: function(fields){
				function format(field){
					var format = {
						group: function(field){
							return tools.form.export(field.fields);
						},
						pointer: function(field){
							if(!field.value)
								return null;
							return {
								__type: 	'Pointer',
								className: 	field.ptr.database,
								objectId: 	field.value
							}
						},
						file: function(field){
							//update all permissions
							if(field.value){
								field.value.forEach(function(file){
									field.permissions.forEach(function(permission){
										Google.drive.permission.set(file.id, permission).then(function(r){
											toastr.success('Files Shared.')
										}, function(e){
											toastr.error('Some files were not shared correctly.')
										})
									})
								})
							}
							return field.value;
						},
						date: function(field){
							var d = new Date()
							var m = d.getTimezoneOffset();
							return {
								__type: 	'Date',
								iso: 		moment(field.value).toDate() //.subtract(m, 'minutes').toDate()
							}
						},
						geoPoint: function(field){
							if(!field.value)
								return null;
							return {
								__type: 	'GeoPoint',
								latitude: 	field.value[0],
								longitude: 	field.value[1]
							}
						}
					}
					var formatOptions = Object.keys(format);
					if(formatOptions.indexOf(field.type) != -1)
						return format[field.type](field)
					else
						return field.value;
				}
				var data = {}
				for(var i=0; i<fields.length; i++){
					(function(field){
						if(field.array){
							var arr = [];
							for(var i=0; i<field.value.length; i++){
								console.log('array', field.value[i])
								arr.push(format(field.value[i]))
							}
							data[field.name] = arr;
						}else{
							data[field.name] = format(field)
						}
					})(fields[i])
				}
				return data;
			},
			preSave: function(form, data){
				var deferred = $q.defer();
				var format = {
					savedOn: function(){
						var deferred = $q.defer();
						data[form.onSubmit.savedOn] = {
							__type: 	'Date',
							iso: 		moment().toDate()
						}
					
						deferred.resolve()
						return deferred.promise;
					},
					savedAt: function(){
						var deferred = $q.defer();
						navigator.geolocation.getCurrentPosition(function(position){
							data[form.onSubmit.savedAt] = {
								__type: 	'GeoPoint',
								latitude:	position.coords.latitude,
								longitude:	position.coords.longitude
							}
							deferred.resolve()
						})
						return deferred.promise;
					}
				}
				
				var promises = []
				var options = Object.keys(format);
				options.forEach(function(option){
					if(form.onSubmit && form.onSubmit[option])
						promises.push(format[option]())
				})
				
				$q.all(promises).then(function(){
					deferred.resolve(data)
				})
				return deferred.promise;
			},
			save: function(){
				if(!$scope.saving){
					$scope.saving = true;
					var form = $scope.form;
					var data = tools.form.export(form.fields);
						data = angular.merge($scope.data, data);
					
					tools.form.preSave(form, data).then(function(data){
						$scope.data = data;
						var request = {
							formId: form.objectId,
							dataId: data.objectId,
							data: 	data
						}
						$http.post('https://api.parse.com/1/functions/formSubmit', request).success(function(data){
							$scope.data.objectId = data.result.objectId
							form.onSubmit = form.onSubmit || {};
							var message = form.onSubmit.message || 'Data Saved';
							var message = 'Form Saved!'
							
							$scope.saving = false;
							if(form.onSubmit.link)
								window.location = form.onSubmit.link
							else
								tools.form.end.modal();
							toastr.success(message)
						}).error(function(e){
							$scope.saving = false;
							toastr.error(e)
						})
					})
				}
			},
			end: {
				modal: function(form){
					$('#endOptions').modal('show');
				},
				continue: function(){
					$scope.form = angular.copy($scope.orig);
					tools.form.import($scope.form.fields, $scope.data).then(function(fields){
						$scope.form.fields = fields;
						$('#endOptions').modal('hide');
					})
				},
				keepData: function(){
					delete $scope.data.objectId;
					$('#endOptions').modal('hide');
				},
				clearAll: function(){
					$scope.data = {};
					$scope.form = angular.copy($scope.orig);
					tools.form.import($scope.form.fields, {}).then(function(fields){
						$scope.form.fields = fields;
					})
					$('#endOptions').modal('hide');
				},
			}
		},
		item: {
			id: function($parent){
				var name = '';
				while($parent && $parent.$parent){
					name+=$parent.$id
					$parent = $parent.$parent;
				}
				return name;
			},
			pointer: function(field){
				// console.log('a',field)
			},
			remove: function(parent, item){
				parent.splice(parent.indexOf(item), 1)
			},
			addFiles: function(item){
				item.value = item.value || [];
				var ol = angular.copy(item.value)
				
				Google.drive.picker.generate(10).then(function(data){
					ol = ol.concat(data.docs)
					item.value = angular.extend(item.value, ol)
				})
			},
			addImages: function(item){
				var preset = item.preset || $scope.config.cloudinary.preset
				cloudinary.openUploadWidget({
					cloud_name: $scope.config.cloudinary.name,
					upload_preset: preset,
					theme: 'white',
					multiple: item.varientArray,
				},
				function(error, result) {
					function simplify(img){
						return {
							etag: img.etag,
							public_id: img.public_id,
							secure_url: img.secure_url,
							thumbnail_url: img.thumbnail_url,
							url: img.url
						}
					}
					if(item.varientArray){
						if(!item.value)
							item.value = []
						item.value = item.value.concat(result.map(simplify))
					}else{
						if(result){
							item.value = result[0]
						}
					}
					$scope.$apply();
				});
			},
			addArr: function(field){
				var instance = angular.copy(field);
				delete instance.array;
				delete instance.value;
				if(!Array.isArray(field.value))
					field.value=[];
				tools.form.import([instance], {}).then(function(fields){
					field.value.push(fields[0]);
				})
			},
			setGeo: function(event, field){
				field.value = [event.latLng.lat(), event.latLng.lng()]
			}
		},
		random: {
			interpolate: function(template, scope){
				return $interpolate(template)(scope)
			},
		}
	}
	
	Forms.list().then(function(list){
		$scope.forms = list;
		tools.init()
	})
	
	it.AdminFormsFillCtrl = $scope;
});