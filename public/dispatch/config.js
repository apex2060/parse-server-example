
app.factory('config', function ($http, $q) {
	var config = {
		oauth: 			encodeURI('https://the.easybusiness.center/offline'),
		parse: {
			root: 		'https://api.parse.com/1',
			appId: 		'ETf61cYOebIkncxvVgrldjmPX4Z2acpWiKfY9wWM',
			jsKey: 		'i3MNq4GYuP6ays3LNQdijimLuaN5uOJst1n87bVy',
			restKey: 	'Wcpk6SaGnzklz5S0OhtngeYD6KJzNIoQ3VmyUgtK'
		},
		google: {
			"client_id": "821954483-q3ooncrbh8cmo8ukcupov77hfn41i6g9.apps.googleusercontent.com",
			"project_id": "easy-business-center",
			"auth_uri": "https://accounts.google.com/o/oauth2/auth",
			"token_uri": "https://accounts.google.com/o/oauth2/token",
			"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
			"redirect_uris": ["https://root-apex2060.c9users.io/oauth", "https://easybusiness.center/oauth", "http://easybusiness.center/oauth"],
			"javascript_origins": ["https://root-apex2060.c9users.io", "http://easybusiness.center", "https://easybusiness.center"],
		},
	}
	$http.defaults.headers.common['X-Parse-Application-Id'] = config.parse.appId;
	$http.defaults.headers.common['X-Parse-REST-API-Key'] = config.parse.restKey;
	$http.defaults.headers.common['Content-Type'] = 'application/json';
	return config;
})