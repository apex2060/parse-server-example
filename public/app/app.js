var it = {};
var app = null;
var siteApp = null;

function initAngular(callback){
	siteApp = angular.module('SiteApp', ['ngAnimate','ngRoute','ngTouch','ngMap','sticky','chart.js','ngDraggable','app']);
	app.config(function($routeProvider,$compileProvider,$controllerProvider,$provide) {
		var dep = {
			slickGrid: ['vendor/slickGrid/slick.core.js','vendor/slickGrid/slick.grid.js','vendor/slickGrid/slick.editors.js','vendor/slickGrid/slick.formatters.js']
		}
		app.lazy = {
			controller: $controllerProvider.register,
			factory: 	$provide.factory,
			service: 	$provide.service,
		};
	
		var parent 		= ['scalehouse', 'page', 'insight', 'forms', 'insight2']
	 	// :module/index.html		>	:module/ctrl.js
		var child		= ['admin', 'employee', 'communication']
		// :module/:view/index.html	> 	:module/:view/ctrl.js
		var sibbling	= ['main']
		// :module/:view.html		> 	:module/ctrl.js
		var double		= []
		// :module/:view/index.html	> 	:module/ctrl.js + :module/:view/ctrl.js
		
		// Require specific js files for modules.
		function requires($q, module, view, id){
			var deferred = $q.defer();
			var includes = [];
			
			if(module=='forms'){
				includes.push('vendor/jSignature/flashcanvas.js')
				includes.push('vendor/jSignature/jSignature.min.js')
			}
			if(module=='admin'){
				includes=includes.concat(dep.slickGrid)
			}
			
			
			if(parent.indexOf(module) != -1)
				includes.push('modules/'+module+'/ctrl.js');
			if(child.indexOf(module) != -1)
				if(view)
					includes.push('modules/'+module+'/'+view+'/ctrl.js');
				else
					includes.push('modules/'+module+'/ctrl.js');
			if(sibbling.indexOf(module) != -1)
				includes.push('modules/'+module+'/ctrl.js');
			if(double.indexOf(module) != -1){
				includes.push('modules/'+module+'/ctrl.js');
				if(view)
					includes.push('modules/'+module+'/'+view+'/ctrl.js');
			}
			if(!includes.length)
				if(view)
					includes.push('modules/'+module+'/'+view+'/ctrl.js');
				else
					includes.push('modules/'+module+'/ctrl.js');
					
			console.log(includes)
			if(includes.length)
				require(includes, function () {
					deferred.resolve();
				});
			else
				deferred.resolve();
				
			return deferred.promise;
		}
		function path(module, view, id){
			if(parent.indexOf(module) != -1)
				return 'modules/'+module+'/index.html';
			if(child.indexOf(module) != -1)
				if(view)
					return 'modules/'+module+'/'+view+'/index.html';
				else
					return 'modules/'+module+'/index.html';
			if(sibbling.indexOf(module) != -1)
				if(view)
					return 'modules/'+module+'/'+view+'.html';
				else
					return 'modules/'+module+'/index.html';
			if(double.indexOf(module) != -1)
				if(view)
					return 'modules/'+module+'/'+view+'/index.html';
				else
					return 'modules/'+module+'/index.html';
					
			if(view)
				return 'modules/'+module+'/'+view+'/index.html';
			else
				return 'modules/'+module+'/index.html';
		}
	
		$routeProvider
		.when('/:module', {
			reloadOnSearch: false,
			templateUrl: function(){
				var pieces = location.hash.split('/');
				return path(pieces[1])
			},
			resolve: {
				load: ['$q', '$rootScope', '$location', function ($q, $rootScope, $location) {
					var pieces = $location.path().split('/');
					return requires($q, pieces[1], null, null)
				}]
			}
		})
		.when('/:module/:view', {
			reloadOnSearch: false,
			templateUrl: function(){
				var pieces = location.hash.split('/');
				return path(pieces[1], pieces[2])
			},
			resolve: {
				load: ['$q', '$rootScope', '$location', function ($q, $rootScope, $location) {
					var pieces = $location.path().split('/');
					return requires($q, pieces[1], pieces[2], null)
				}]
			}
		})
		.when('/:module/:view/:id', {
			reloadOnSearch: false,
			templateUrl: function(){
				var pieces = location.hash.split('/');
				return path(pieces[1], pieces[2], pieces[3])
			},
			resolve: {
				load: ['$q', '$rootScope', '$location', function ($q, $rootScope, $location) {
					var pieces = $location.path().split('/');
					return requires($q, pieces[1], pieces[2], pieces[3])
				}]
			}
		})
		.otherwise({
			redirectTo: '/page/main'
		});
	});
	angular.bootstrap(document, ['SiteApp']);
}
// app.run(['$window', '$rootScope', function($window, $rootScope) {
// 	new WOW().init();
// 	$rootScope.$on('$routeChangeStart', function(next, current) {
// 		new WOW().sync();
// 	});
// }])


		
var inc1 = [
	'vendor/jquery.min.js',
]
var inc2 = [
	'//cdn.plaid.com/link/stable/link-initialize.js',
	'//ajax.googleapis.com/ajax/libs/angularjs/1.4.9/angular.min.js',
	
	'vendor/jquery-ui.min.js',
	'//widget.cloudinary.com/global/all.js',
	'//www.parsecdn.com/js/parse-1.3.1.min.js',
	'//www.gstatic.com/firebasejs/3.0.0/firebase.js',
	'//cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.4/moment.js',
	'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.1.6/Chart.min.js',
	
	'//apis.google.com/js/client:platform.js?onload=letsBegin',
	'//js.stripe.com/v2/',
]
var inc3 = [
	'vendor/bootstrap.min.js',
	'//www.google.com/jsapi',
	'vendor/pouchdb.min.js',
	'vendor/vendor.min.js',
	'vendor/toastr/toastr.min.js',
	
	'//ajax.googleapis.com/ajax/libs/angularjs/1.4.9/angular-animate.min.js',
	'//ajax.googleapis.com/ajax/libs/angularjs/1.4.9/angular-route.min.js',
	'//ajax.googleapis.com/ajax/libs/angularjs/1.4.9/angular-touch.min.js',
	
	'vendor/angular-dragDrop.js',
	'vendor/angular-sticky.min.js',
	'vendor/angular-chart.js',
	'vendor/angular-map.min'
]
var inc4 = [
	'/app/config.js',
	'/app/custom.js',
	'/app/directives.js',
	'/app/services.js',
	'/app/controllers.js'
]

var letsBegin = null;
var authPromise = new Promise(function(resolve, reject) {
	letsBegin = function(){
		resolve();
	}
});

//for slow connections
require.config({
	waitSeconds: 0,
	shim: {
	'vendor/jquery.min.js': {
		exports: '$'
	}}
})
require(inc1, function(){
	require(inc2, function(Plaid){
		window.Plaid = Plaid;
		app = angular.module('app', []);
		require(inc3, function(){
			authPromise.then(function(){
				require(inc4, function(){
					initAngular();
				})
			})
		})
	})
})