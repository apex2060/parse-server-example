exports.TESTING = true;

exports.DEFAULTS = {
	city: 		'Moab',
	state: 		'Utah',
	state2: 	'UT',
	zip: 		'84532',
	areaCode: 	'435'
}

exports.KEY = {
	URL: 			'https://the.southtown.repair',
	OAUTH_URL: 		'https://the.southtown.repair/oauth',
	PARSE_URL: 		'https://southtown.parseapp.com',
	PARSE_APPID: 	'bI6VbpbzEzHp11ia30Y4UvWrc4fAEiJAPNM2FQki',
	PARSE_MASTER: 	'RxDCtbR9yqYhsIk7plRsukLGrO0sMdJgYCWSkwJz',
	MAILGUN_URL: 	'email.southtown.repair',
	MAILGUN_KEY: 	'key-fffe2f2d0e2fa0f618f62940b0c1eb17',
	FIREBASE_URL: 	'https://southtown-repair.firebaseio.com/',
	FIREBASE_KEY: 	'S7iGiiJgRcNdACIouHbVRglqMZCjJhyXifxmTcix',
	STRIPE: 		'',

	// Lob is a physical mail api
	LOB: {
		auth_id:	'',
		auth_token:	'',
	},
	PLIVO: {
		auth_id: 	'MAMDI0OWRIMJEYMMFIOD',
		auth_token: 'Zjg0ZGEzMmY0MTNmNTgxMmYzZGFhNWM0ZWEyOGIy',
		number: 	'14353832649'
	},
	PHAXIO: {
		api_key: 	'',
		api_secret: '',
	},
	APPS_DOMAIN: 	'southtown.repair',
	GOOGLE: {
		"client_id": "857868996348-igbqav87btas0ob77s5uncgu91iji98m.apps.googleusercontent.com",
		"project_id": "southtown-repair",
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://accounts.google.com/o/oauth2/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_secret": "6mhoSy6AwDY-lMlMZ4uIeCxT",
		"redirect_uris": ["https://southtown-repair.firebaseapp.com/__/auth/handler", "http://southtown.repair/oauth", "https://southtown.repair/oauth"],
		"javascript_origins": ["http://localhost", "http://localhost:5000", "https://southtown-repair.firebaseapp.com", "http://southtown.repair", "https://southtown.repair"],
		"server_key": "AIzaSyDIUprUPM01i31usoMo7fdu0xc6V-zxZvg"
	},
	FACEBOOK: {
		app_id: 		'',
		app_secret: 	'',
		verify_token:	'',
		page_token: 	''
	},
	MERAKI: 			'',
	NEST: {
		client_id: 		'',
		client_secret: 	''
	},
	DISPATCH: {
		key_id: 	'',
		device_id: 	''
	},
	PLAID: {
		url: 			'https://tartan.plaid.com',
		client_id: 		'',
		secret: 		''
	},
	INTUIT: {
		app_id: 		'',
		app_token: 		'',
		oauth_key: 		'',
		oauth_secret: 	''
	},
	PDF: { //Filler
		client_id: 		'62750370',
		secret: 		'wHgryHjqXuhnmsUtOzYH3KmQYAOULx1nDCP3NmZs'
	},
	CLOUDINARY: {
		cloud_name: 	'southtown',
		api_key: 		'362539452712588',
		api_secret: 	'nuR87FCTWqxcafHxB4OunA8qAFw',
		fax_preset: 	'file_upload'
	},
	DREAMFACTORY: {
		url: 			'http://api.southtown.repair/api/v2',
		api_key: 		''
	}
}
