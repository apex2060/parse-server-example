var Firebase = null;
app.factory('config', function($http, $q) {
	var config = {};
	var rootConfig = {
		appsDomain: 'southtown.repair',
		secureUrl: 'http://the.southtown.repair',
		oauth: encodeURI('http://the.southtown.repair/oauth'),
		parse: {
			root: 'https://southtown.herokuapp.com/parse',
			appId: 'southtown',
			jsKey: 'X5vYd1GoMOYwE5s4oJIvxFptTLUwiwP7AH5RdQEP',
			restKey: 'A1Sdxv9zPYJii2SKvr7qCGGhHtwuQEvSpwIUrzfy'
		},
		firebase: {
			apiKey: "AIzaSyCsmcdKfcCyPezmOAUTgvu2rpFspYRpCow",
			authDomain: "southtown-repair.firebaseapp.com",
			databaseURL: "https://southtown-repair.firebaseio.com",
			storageBucket: "",
			messagingSenderId: "857868996348"
		},
		nest: '',
		stripe: '',
		ocr: '71ff105c9788957', //ocr.space/OCRAPI
		plaid: {
			client_id: '',
			public_key: ''
		},
		cloudinary: {
			name: 'southtown',
			preset: 'mainSite'
		},
		google: {
			"client_id": "857868996348-igbqav87btas0ob77s5uncgu91iji98m.apps.googleusercontent.com",
			"project_id": "southtown-repair",
			"auth_uri": "https://accounts.google.com/o/oauth2/auth",
			"token_uri": "https://accounts.google.com/o/oauth2/token",
			"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
			"client_secret": "6mhoSy6AwDY-lMlMZ4uIeCxT",
			"redirect_uris": ["https://southtown-repair.firebaseapp.com/__/auth/handler", "http://southtown.repair/oauth", "https://southtown.repair/oauth"],
			"javascript_origins": ["http://localhost", "http://localhost:5000", "https://southtown-repair.firebaseapp.com", "http://southtown.repair", "https://southtown.repair"],
			"browser_key": "AIzaSyCsmcdKfcCyPezmOAUTgvu2rpFspYRpCow"
		}
	}

	function init(newConfig) {
		if (config.status != 'initialized') {
			if (newConfig)
				localStorage.setItem('config', angular.toJson(newConfig))
			if (localStorage.getItem('config'))
				newConfig = angular.fromJson(localStorage.getItem('config'))
			else
				newConfig = rootConfig;
			config = angular.extend(newConfig, {
				status: 'initialized',
				init: init,
				pConfig: pConfig,
				reset: reset,
			})
			Parse.initialize(config.parse.appId, config.parse.jsKey);
			Firebase = firebase.initializeApp(config.firebase);
			$http.defaults.headers.common['X-Parse-Application-Id'] = config.parse.appId;
			$http.defaults.headers.common['X-Parse-REST-API-Key'] = config.parse.restKey;
			$http.defaults.headers.common['Content-Type'] = 'application/json';
		}
		return pConfig();
	}

	function pConfig() {
		var deferred = $q.defer();
		$http.get('https://api.parse.com/1/classes/Config').success(function(data) {
			if (data.results.length)
				config = angular.extend(config, {
					params: data.results[0]
				});
			else
				config.params = {};
			deferred.resolve(config);
		})
		return deferred.promise;
	}

	function reset() {
		localStorage.removeItem('config');
		init();
		pConfig();
	}

	init();
	return config;
});