app.lazy.controller('GekoCtrl', function($rootScope, $scope, $http, Parse, Auth, config) {
	var FmSites = new Parse('FmSites');
	var tools = $scope.tools = {
		init: function() {
			$scope.state = 'refreshing'
			FmSites.list().then(function(sites){
				$scope.state = 'loaded';
				$scope.sites = sites;
			})
		},
		state: function(check){
			return $scope.state == check;
		},
		create: function(){
			$scope.focus = {
				"appsDomain": "easybusiness.center",
				"secureUrl": "https://the.easybusiness.center",
				"oauth": "https://the.easybusiness.center/oauth",
				"firebase": "https://easybusiness.firebaseio.com/",
				"google": {
					"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
					"auth_uri": "https://accounts.google.com/o/oauth2/auth",
					"client_id": "821954483-q3ooncrbh8cmo8ukcupov77hfn41i6g9.apps.googleusercontent.com",
					"client_secret": "jG4FoLYpU6TC7Pfk9O3iZtJV",
					"javascript_origins": ["https://root-apex2060.c9users.io", "http://easybusiness.center", "https://easybusiness.center"],
					"project_id": "easy-business-center",
					"redirect_uris": ["https://root-apex2060.c9users.io/oauth", "https://easybusiness.center/oauth", "http://easybusiness.center/oauth"],
					"token_uri": "https://accounts.google.com/o/oauth2/token"
				},
				"cloudinary": {
					"cloud_name": 	"easybusiness",
					"preset": 		"sampleSites"
				}
			}
		},
		focus: function(item) {
			$scope.focus = item;
		},
		save: function(site) {
			FmSites.save(site).then(function(){
				toastr.success('Site Saved.')
				tools.init();
			});
		},
		emulate: function(site) {
			localStorage.clear();
			$http.defaults.headers.common['X-Parse-Session-Token'] = null;
			
			if(site)
				site.emulating = true;
			config.init(site).then(function(config){
				$rootScope.config = config;
				$rootScope.tools.sampleSetup(config);
				Auth.tools.reload().then(function(me) {
					$rootScope.user = me;
				})
			})
		},
		initSetup: function(){
			$http.post(config.parse.root+'/functions/initSetup', {}).success(function(){
				Auth.tools.reload().then(function(me) {
					$rootScope.user = me;
					toastr.success('Site Initialized.');
				})
			})
		},
		isEmulated: function(){
			if($scope.focus && $scope.focus.parse)
				return ($http.defaults.headers.common['X-Parse-Application-Id'] == $scope.focus.parse.appId);
			else
				return false;
		},
		deEmulate: function(){
			config.reset();
			tools.emulate();
		}
	}
	tools.init();
	it.GekoCtrl = $scope;
});
