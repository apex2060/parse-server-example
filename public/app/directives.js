app.directive('drawer', ['$timeout', function($timeout) {
	return {
		restrict: 'E',
		link: function(scope, elm, attrs, ctrl) {
			scope.drawer = {
				partial: 	'partials/generic.html',
				height: 	'300px',
				visable: 	false
			};
			
			if(attrs.visable != undefined)
				scope.drawer.visable = attrs.visable;
				
			attrs.$observe('visable', function(value) {
				console.log('visable',value);
			});
		},
		templateUrl: 'static/drawer.html',
		replace: true
	};
}]);

app.directive('signature', function($timeout){
	return {
		restrict: 'E',
		replace: true,
		template:	'<div style="position:relative;">'+
						'<div class="signature"><span>Sign On Line</span> | <a ng-click="signature.clear()">Clear Signature</a></div>'+
					 	''+
					'</div>',
		require: "ngModel",
		link: function(scope, ele, attrs,  ngModel){
			var signature = {};
			var sig = ele.children()[0];
			function waitToRender(sig){
				if(sig.offsetParent !== null)
					$(sig).jSignature();
				else
					$timeout(function(){
						waitToRender(sig);
					}, 1000)
			}
			waitToRender(sig);
			
			ngModel.$render = function() {
				return scope.signature.load(ngModel.$viewValue);
			};
			$(sig).bind('change', function(e){
				/* 'e.target' will refer to div with "#signature" */ 
				var datapair = $(sig).jSignature("getData", "svgbase64") 
				var src = "data:" + datapair[0] + "," + datapair[1]
					datapair = $(sig).jSignature("getData","base30") 
				
				signature = {
					type: 		'signature',
					date: 		new Date(),
					src: 		src,
					datapair: 	datapair,
				};
				ngModel.$setViewValue(signature);
			})
			scope.signature = {
				load: function(signature){
					if(signature)
						$(sig).jSignature("setData", "data:" + signature.datapair.join(",")) 
				},
				clear: function(){
					$(sig).jSignature("reset");
					signature = {};
					ngModel.$setViewValue(signature);
				},
			}
		}
	}
})
app.directive('mediaManager', function($q) {
	return {
		restrict: 'A',
		replace: true,
		transclude: true,
		template:	'<div>'+
				 		'<input type="file" class="hidden" accept="image/*" capture="camera">'+
						'<div ng-transclude></div>'+
					'</div>',
		scope: {
			callback: 	'=mediaManager',
			parent: 	'=parent'
		},
		link: function(scope, elem, attrs, ctrl) {

			if(typeof(scope.callback)!='function'){
				console.error('mediaManager: no callback defined.',scope.callback)
				return;
			}

			var processDragOverOrEnter = function(event) {
				if (event != null) {
					event.preventDefault();
				}
				event.originalEvent.dataTransfer.effectAllowed = 'copy';
				return false;
			};


			elem.bind('click', function(e){
				//At some point, this may end up being a call to open a modal which links to the media list
				$(elem).children('input')[0].click()
			});

			elem.bind('change', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.target.files.map(function(file){
					var deferred = $q.defer();
					var reader = new FileReader();
					reader.onload = function(evt) {
						deferred.resolve({
							raw: file,
							parent: scope.parent,
							src: evt.target.result
						})
					};
					reader.readAsDataURL(file);
					return deferred.promise;
				})
				$q.all(files).success(function(files){
					scope.callback(files)
				})
				return false;
			});
			elem.bind('dragover', processDragOverOrEnter);
			elem.bind('dragenter', processDragOverOrEnter);
			return elem.bind('drop', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.originalEvent.dataTransfer.files.map(function(file){
					var deferred = $q.defer();
					var reader = new FileReader();
					reader.onload = function(evt) {
						deferred.resolve({
							raw: file,
							parent: scope.parent,
							src: evt.target.result
						})
					};
					reader.readAsDataURL(file);
					return deferred.promise;
				})
				$q.all(files).success(function(files){
					scope.callback(files)
				})
				return false;
			});
		}
	};
});
app.directive('fileManager', function($q) {
	return {
		restrict: 'A',
		replace: true,
		transclude: true,
		template:	'<div>'+
				 		'<input type="file" class="hidden">'+
						'<div ng-transclude></div>'+
					'</div>',
		scope: {
			callback: 	'=fileManager',
			parent: 	'=parent'
		},
		link: function(scope, elem, attrs, ctrl) {

			if(typeof(scope.callback)!='function'){
				console.error('fileManager: no callback defined.',scope.callback)
				return;
			}

			var processDragOverOrEnter = function(event) {
				if (event != null) {
					event.preventDefault();
				}
				event.originalEvent.dataTransfer.effectAllowed = 'copy';
				return false;
			};


			elem.bind('click', function(e){
				//At some point, this may end up being a call to open a modal which links to the media list
				$(elem).children('input')[0].click()
			});

			elem.bind('change', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.target.files.map(function(file){
					var deferred = $q.defer();
					var reader = new FileReader();
					reader.onload = function(evt) {
						deferred.resolve({
							raw: file,
							parent: scope.parent,
							src: evt.target.result
						})
					};
					reader.readAsDataURL(file);
					return deferred.promise;
				})
				$q.all(files).success(function(files){
					scope.callback(files)
				})
				return false;
			});
			elem.bind('dragover', processDragOverOrEnter);
			elem.bind('dragenter', processDragOverOrEnter);
			return elem.bind('drop', function(e) {
				if (e != null) {
					e.preventDefault();
				}
				var files = e.originalEvent.dataTransfer.files.map(function(file){
					var deferred = $q.defer();
					var reader = new FileReader();
					reader.onload = function(evt) {
						deferred.resolve({
							raw: file,
							parent: scope.parent,
							src: evt.target.result
						})
					};
					reader.readAsDataURL(file);
					return deferred.promise;
				})
				$q.all(files).success(function(files){
					scope.callback(files)
				})
				return false;
			});
		}
	};
});

app.directive('ngEnter', function() {
	return function(scope, element, attrs) {
		element.bind("keydown keypress", function(event) {
			if (event.which === 13) {
				scope.$apply(function() {
					scope.$eval(attrs.ngEnter);
				});

				event.preventDefault();
			}
		});
	};
});
app.directive("contenteditable", function() {
	return {
		restrict: "A",
		require: "ngModel",
		link: function(scope, element, attrs, ngModel) {
			var read;
			if(!ngModel)
				return;
			
			ngModel.$render = function() {
				return element.text(ngModel.$viewValue || attrs.placeholder);
			};
			element.bind('blur', function() {
				if (ngModel.$viewValue !== $.trim(element.text())) {
					return scope.$apply(read);
				}
			});
			return read = function() {
				var newVal = $.trim(element.text())
				if(!newVal && attrs.placeholder){
					newVal = attrs.placeholder;
					element.text(newVal);
				}
				return ngModel.$setViewValue(newVal);
			};
		}
	};
});

//Cloudinary Transformations to Images
app.directive('clSrc', function($timeout) {
	return {
		restrict: 'A',
		scope: { clSrc: '@'},
		link: function(scope, ele, attrs) {
			it.clattr = attrs;
			var clKeys = Object.keys(attrs)
			clKeys = clKeys.filter(function(key){
				return key.indexOf('transform') == 0
			})
			var transform = ''
			clKeys.forEach(function(key, i){
				var val = attrs[key];
				transform += key.replace('transform','').toLowerCase() + '_' + val
				if(i != clKeys.length - 1)
					transform += ','
			})
			if(clKeys.length && !attrs['transformC'])
				transform += ',c_fill'
			if(attrs['auto']){
				if(clKeys.length)
					transform += ','
				transform += 'g_auto,q_auto,f_auto'
			}
			scope.$watch('clSrc', function(val) {
				if(val){
					var tsrc = val.split('upload')
					var src = tsrc[0]+'upload/'+transform+tsrc[1]
					$(ele).attr("src", src);
				}
			})
		}
	};
});

app.directive('report', function($compile, $sce) {
	return {
		restrict: 'A',
		replace: true,
		link: function(scope, ele, attrs) {
			scope.$watch(attrs.report, function(html) {
				html = html.replace('script', '')
				html = html.replace('onclick', '')
				ele.html(html);
				$compile(ele.contents())(scope);
			});
		}
	};
});

app.filter('capitalize', function() {
	return function(input, scope) {
		if (input != null)
			input = input.toLowerCase();
		return input.substring(0, 1).toUpperCase() + input.substring(1);
	}
});

app.filter('map', function(){
	return function(input, key){
		return input.map(function(item){
			return item[key]
		})
	}
})
app.directive('compile', function($compile) {
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			scope.$watch(function() {return element.attr('compile'); }, function(newValue){
				element.html($compile(attr.compile)(scope));
				it.e = element;
			});
		}
	}
})
app.directive('grid', function($compile, $timeout) {
	return {
		restrict: 'A',
		scope: {
			grid: 	'=',
		},
		link: function(scope, element, attr) {
			$(element).css({
				display: 'block',
				height: '500px'
			})
			
			function keep(api){
				api.onColumnsReordered.subscribe(function(){
					scope.grid.columns = api.getColumns();
					scope.$apply();
				})
				api.onCellChange.subscribe(function(evt, data){
					data.item._dirty = true;
					api.invalidateRow(data.row);
					api.render();
					scope.grid.data = api.getData();
					scope.grid.changed = scope.grid.data.filter(function(item){
						return item._dirty
					}, true);
					scope.$apply();
					//Callback with row??
					it.change = data;
				})
			}
			
			if(scope.grid && scope.grid.columns && !scope.grid.api){
				scope.grid.api = new Slick.Grid($(element), scope.grid.data, scope.grid.columns, scope.grid.options);
				scope.grid.api.autosizeColumns();
				keep(scope.grid.api);
			}else{
				scope.$watch('grid.data', function(){
					if(scope.grid && scope.grid.columns){
						if(!scope.grid.api){
							scope.grid.api = new Slick.Grid($(element), scope.grid.data, scope.grid.columns, scope.grid.options);
							scope.grid.api.autosizeColumns();
							keep(scope.grid.api)
							if(scope.grid.ready)
								scope.grid.ready(scope.grid.api)
						}else{
							scope.grid.api.setColumns(scope.grid.columns)
							scope.grid.api.setData(scope.grid.data)
							scope.grid.api.render();
						}
					}
				})
			}
			// function reformat(){
			// 	var cells = $(element).find('tbody tr:first').children()
			// 	var colWidth = cells.map(function() {
			// 		return $(this).width();
			// 	}).get();
				
			// 	$(element).find('thead tr').children().each(function(i, v) {
			// 		$(v).width(colWidth[i]);
			// 	});
			// }
			// scope.$watch(function() {
			// 	console.log('data change')
			// 	reformat();
			// });
		}
	}
})