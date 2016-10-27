app.controller('SiteCtrl', function($rootScope, config, Auth, User, Stripe){
	it.user = Auth;
	
	require(['//maps.google.com/maps/api/js?sensor=true&libraries=geometry,drawing&key='+config.google.browser_key])
	
	config.init().then(function(config){
		$rootScope.config = config;
		if(config.emulating){
			Auth.tools.reload().then(function(me){
				$rootScope.user = me;
				tools.sampleSetup(config);
			})
		}else{
			Auth.init().then(function(me){
				$rootScope.user = me;
			})
		}
	})
	
	$rootScope.notify = function(type, message){
		toastr[type](message);
	}
	var tools = $rootScope.tools = {
		stripe: Stripe,
		clearStorage: function(){
			if(prompt('Enter Clear Code: ') == '159487')
				localStorage.clear();
		},
		user: {
			logout: function(){
				Auth.tools.logout();
				$rootScope.user = null;
				var loc = document.location.href
				document.location.href = "https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue="+loc;
			},
			login: function(){
				Auth.tools.login().catch(function(response){
					if(response && response.error)
						alert(response.error);
				})
			},
			addScope: function(scope){
				return Auth.tools.google.scopes(scope)
			}
		},
		sampleSetup: function(config){
			if (config.params.background)
				document.body.style.backgroundImage = 'url("' + config.params.background.secure_url + '")';
			if (config.params.bgSize)
				$('body').css('background-size', config.params.bgSize);
			if (config.params.theme)
				$('#theme').attr('href', config.params.theme);
		}
	}
	
	
	it.SiteCtrl = $rootScope;
});