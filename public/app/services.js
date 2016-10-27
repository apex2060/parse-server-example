app.factory('Easy', function ($http, $q, $timeout, $sce, config) {
	var Easy = {
		map: function(geo, size, zoom){	//size = 600x300
			if(!geo)
				return '/static/img/worldsm.jpg';
			if(!size)
				size = '600x300';
			if(!zoom)
				zoom = 13;
				
			var lat = geo.latitude;
			var lng = geo.longitude;
			return '//maps.googleapis.com/maps/api/staticmap?center='+lat+','+lng+'&zoom='+zoom+'&size='+size+'&maptype=roadmap&markers=color:blue%7Clabel:S%7C'+lat+','+lng;
		},
		mapLink: function(geo){
			if(geo)
				return 'http://maps.google.com/maps?q='+geo.latitude+','+geo.longitude
		},
		weather: function(city){
			var weather = this;
				weather.errors = [];
			weather.temperature = function(){
				return weather.data.main.temp;
			}
			weather.sunrise = function(){
				if(weather.data && weather.data.sys){
					var sunrise = weather.data.sys.sunrise
					return moment(moment.utc().seconds(sunrise).diff(moment())).format('h:mm')
				}
			}
			weather.sunset = function(){
				if(weather.data && weather.data.sys){
					var sunset = weather.data.sys.sunset
					return moment(moment.utc().seconds(sunset).diff(moment())).format('h:mm')
				}
			}
			weather.load = function(city){
				if(city){
					weather.city = city;
					$http.post(config.parse.root+'/functions/weather', {location: weather.city}).success(function(data){
						weather.data = data.result;
						if(data.result.weather){
							console.log('weather for: '+city)
							weather.icon = 'http://openweathermap.org/img/w/'+weather.data.weather[0].icon+'.png';
						}else{
							console.log('error'+weather.errors.length)
							weather.errors.push(data)
							var wait = 1000*weather.errors.length*weather.errors.length;
							if(weather.errors.length<10)
								$timeout(function(){
									weather.load(city)
								}, wait);
						}
					}).error(function(response){
							console.error('Weather error', response)
					})
				}
			}
			
			if(city)
				weather.load(city);
		},
		elements: function(){
			var element = this;
			element.list = {};
			var inputElem 	= function(){
				this.name 		= 'Input';
				this.element 	= 'input';
				this.options 	= ['button','checkbox','color','date ','datetime ','datetime-local ','email ','month ','number ','password','radio','range ','reset','search','submit','tel','text','time ','url','week'];
				this.config 	= {};
				this.create = function(){
					this.config.label 	= prompt('Input label:');
					this.config.name 	= this.config.label.toCamelCase();
					this.config.type 	= prompt('Input type:');
				},
				this.html = function(){
					if(this.config.type)
						return $sce.trustAsHtml(this.config.label+' <input class="form-control" name="'+this.config.name+'" type="'+this.config.type+'" ng-model="form.'+this.config.name+'">');
				}
			}
			var htmlElem 	= function(){
				this.name 		= 'HTML';
				this.options 	= ['div','span','h1','h2','h3'];
				this.config 	= {};
				this.create = function(){
					this.config.content 	= prompt('HTML content:');
					this.config.classes 	= prompt('HTML classes:');
					this.config.type 		= prompt('Input type:');
				},
				this.html = function(){
					if(this.config.type)
						return $sce.trustAsHtml('<'+this.config.type+' class="'+this.config.classes+'">'+this.config.content+'</'+this.config.type+'>');
				}
			}
			element.list.input 	= inputElem;
			element.list.html 	= htmlElem;
		}
	}

	it.Easy = Easy;
	return Easy;
});


app.factory('Stripe', function (config, Parse, $http, $q, Auth) {
	//When a user signs up, we store their credentials in an object and refrence that object from the user's account.
	//No one has access to these objects.  If the refrence exists, then do not prompt - use existing account.
	//Allow users to add more than one account?  Allow users to manage these accounts?
	//Need 2 modals: cc details, checkout 
	var StripeAccount = new Parse('StripeAccount');
	Stripe.setPublishableKey(config.stripe);
	var signup = $q.defer();
	var tools = {
		card: Stripe.card,
		test: function(){
			tools.completeSignup({
				number: '4242424242424242',
				cvc: '343',
				exp_month: '12',
				exp_year: '2019'
			})
			return tools.signup()
		},
		signup: function(force){
			signup = $q.defer();
			if(Auth.pAuth.user.stripe && !force)
				signup.resolve();
			else
				$('#STRIPE').modal('show');
			return signup.promise;
		},
		completeSignup: function(credentials){
			var details = angular.copy(credentials.details);
			delete credentials.details;
			tools.card.createToken(credentials, function(status, response){
				response.email = details.email
				$http.post(config.parse.root+'/functions/stripeSignup', response).success(function(r){
					Auth.pAuth.user.stripe = true
					$('#STRIPE').modal('hide');
					signup.resolve(r)
				}).error(function(e){
					console.error(e)
				})
			});
		},
		checkout: function(description, amount, currency){
			currency = currency || 'USD'
			if(!description || !amount)
				console.error('You must provide a description and amount to checkout.')
			var req = {
				amount: amount,
				currency: currency,
				description: description,
				details: {notes:'Eventually, this may refrence a table and object or objects in a DB'}
			}
			var checkout = $q.defer();
			tools.signup().then(function(account){
				$http.post(config.parse.root+'/functions/stripeCheckout', req).success(function(r){
					checkout.resolve(r)
				}).error(function(e){
					console.error(e)
				})
			})
			return checkout.promise
		},
		plan: function(description, amount, currency, interval){
			currency = currency || 'USD'
			interval = interval || 'month'
			if(!description || !amount)
				console.error('You must provide a description and amount to create a plan.')
			var req = {
				name: description,
				amount: amount,
				currency: currency,
				interval: interval,
			}
			var plan = $q.defer();
			tools.signup().then(function(account){
				$http.post(config.parse.root+'/functions/stripePlan', req).success(function(r){
					plan.resolve(r)
				}).error(function(e){
					console.error(e)
				})
			})
			return plan.promise
		},
		subscribe: function(plan){
			var subscription = $q.defer();
			tools.signup().then(function(account){
				$http.post(config.parse.root+'/functions/stripeSubscribe', plan).success(function(r){
					subscription.resolve(r)
				}).error(function(e){
					console.error(e)
				})
			})
			return subscription.promise
		}
	}
	return tools;
});

app.factory('Auth', function (User) {
	if(!authUser){
		var authUser = new User();
			authUser.init();
	}
	return authUser;
});
app.factory('User', function ($http, $q, $timeout, config) {
	var g = config.google;
	var defaults = {
		scopes: 'email https://www.googleapis.com/auth/plus.me',
	}

	var User = function(scopes){
		var my = this;
				
		var tools = {
			reset: function(scopes){
				my.data 		= {}
				my.status 		= 'start';
				my.data.date	= new Date();
				my.pending 		= true;
				my.sessionToken = null
				my.gAuth 		= null
				my.pAuth		= null
				my.roles 		= []
				my.profile 		= {}
				my.defer 		= $q.defer()
				if(scopes)
					my.data.scopes 	= scopes;
				else
					my.data.scopes 	= defaults.scopes;
			},
			init: function(scopes){
				if(my.status == 'start')
					tools.loadUser(true);
				return my.defer.promise;
			},
			reload: function(){
				tools.reset();
				return tools.init();
			},
			login: function(scopes){
				tools.loadUser();
				return my.defer.promise;
			},
			logout: function(){
				gapi.auth.signOut();
				tools.reset();
			},
			loadUser: function(immediate){
				// alert('Load User')
				// [] TODO This has a problem... it is being called 3+ times
				tools.google.auth(immediate).then(function(gAuth){
					if(gAuth && gAuth.access_token && !gAuth.error){
						tools.parse.auth(gAuth).then(function(){
							tools.userData().then(function(){
								my.pending = false;
								my.defer.resolve(my);
							})
						})
					}else{
						my.error = gAuth;
					}
				}, function(e){
					my.error = e;
					my.defer.reject(e);
					it.me = my;
				})
			},
			is: function(roles) {
				var permissionGranted = true;
				if(typeof(roles)=='string')
					roles = [roles]
				var myRoles = [];
				for(var i=0; i<my.roles.length; i++)
					myRoles.push(my.roles[i].name)
				for(var i=0; i<roles.length; i++)
					if(myRoles.indexOf(roles[i]) == -1)
						permissionGranted = false;
				return permissionGranted;
			},
			isOr: function(roles) {
				var permissionGranted = false;
				if(typeof(roles)=='string')
					roles = [roles]
				var myRoles = [];
				for(var i=0; i<my.roles.length; i++)
					myRoles.push(my.roles[i].name)
				for(var i=0; i<roles.length; i++)
					if(myRoles.indexOf(roles[i]) != -1)
						permissionGranted = true;
				return permissionGranted;
			},
			userData: function(){
				var deferred = $q.defer();
				var profile = tools.google.profile();
				var roles 	= tools.parse.roles.list();
				$q.all([profile, roles]).then(function() {
					deferred.resolve(my);
				});
				return deferred.promise;
			},
			google: {
				offlineLink: function(){
					var services = ['email','profile','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/drive'];
					var scope = services.join("%20")
					return 'https://accounts.google.com/o/oauth2/auth?'+
						'&scope='+scope+
						'&redirect_uri='+config.oauth+
						'&response_type=code'+
						'&access_type=offline'+
						'&client_id='+config.google.client_id+
						'&approval_prompt=force'+
						'&state='+my.objectId
				},
				auth: function(immediate){
					var deferred = $q.defer();
					try{
						gapi.auth.authorize({
							client_id: config.google.client_id, 
							scope: my.data.scopes, 
							immediate: immediate,
						}, function(gAuth){
							my.gAuth = gAuth;
							deferred.resolve(gAuth)
						});
					}catch(e){
						console.error(e);
						// $timeout(function(){
						// 	tools.google.auth().then(function(gAuth){
						// 		deferred.resolve(gAuth)
						// 	})
						// }, 1000)
					}
					return deferred.promise;
				},
				plus: function(){
					return gapi.client.load('plus', 'v1');
				},
				scopes: function(scopes){
					if(typeof(scopes)=='object')
						scopes = scopes.join(' ');
					if(scopes)
						my.data.scopes += ' '+scopes;
					return tools.google.auth();
				},
				profile: function(){
					var deferred = $q.defer();
					if(my.profile && my.profile.length)
						deferred.resolve(my.profile)
					else if(my.gAuth)
						$http.get('https://www.googleapis.com/plus/v1/people/me?access_token='+my.gAuth.access_token).success(function(profile){
							$http.get('https://api.parse.com/1/classes/UserProfile').then(function(response){
		 						my.profile = angular.extend(profile, response.data.results[0])
								my.profile.gId = my.profile.id;
								delete my.profile.id;
			 					deferred.resolve(my.profile);
							}).catch(function(){
		 						my.profile = profile;
								my.profile.gId = my.profile.id;
								delete my.profile.id;
			 					deferred.resolve(my.profile);
							})
		 				});
					return deferred.promise;
				}
			},
			parse: {
				auth: function(gAuth){
					var deferred = $q.defer();
					if(my.status == 'start'){
						my.status = 'looking up google user form parse.';
						$http.post('https://api.parse.com/1/functions/googleAuth', gAuth).success(function(data) {
							my.status = 'parse auth complete.';
							my.pAuth 			= data.result;
							my.objectId 		= data.result.user.objectId;
							my.sessionToken 	= data.result.token;
							// Parse.User.become(my.sessionToken)
							$http.defaults.headers.common['X-Parse-Session-Token'] = my.sessionToken;
							deferred.resolve();
						}).error(function(error){
							my.status = 'error authenticating through parse.';
							deferred.reject(error);
							tools.logout();
						})
					}else{
						deferred.resolve('Already Processing / Processed');
					}
		 			return deferred.promise;
				},
				roles: {
					list: function() {
						var deferred = $q.defer();
						if(my.roles.length) {
							deferred.resolve(my.roles)
						}else{
							var roleQry = 'where={"users":{"__type":"Pointer","className":"_User","objectId":"' + my.objectId + '"}}'
							if(my.objectId)
								$http.get('https://api.parse.com/1/classes/_Role?' + roleQry).success(function(data) {
									my.roles = data.results;
									deferred.resolve(data.results);
								}).error(function(data) {
									deferred.reject(data);
								});
						}
						return deferred.promise;
					},
					toggle: function(roleId) {
						if (typeof(roleId) != 'string')
							roleId = roleId.objectId;

						var operation = 'AddRelation';
						for (var i = 0; i < my.roles.length; i++)
							if (my.roles[i].objectId == roleId)
								operation = 'RemoveRelation';

						var request = {
							users: {
								__op: operation,
								objects: [{
									__type: "Pointer",
									className: "_User",
									objectId: my.objectId
								}]
							}
						}
						$http.put('https://api.parse.com/1/classes/_Role/' + roleId, request).success(function(data) {
							console.log('Role toggled.');
						}).error(function(error) {
							console.error(error);
						})
					}
				}
			}
		}
		tools.reset();
		
		this.tools 	= tools;
		this.is 	= tools.is;
		this.isOr 	= tools.isOr;
		this.init 	= tools.init;
	}
	return User;
});


app.factory('Dream', function ($q, $http, config) {
	return function(db, table){
		this.db = db;
		this.table = table;
		
		this.schema = function(){
			var deferred = $q.defer();
			$http.post(config.parse.root+'/functions/api', {
				method: 'GET',
				path: 	'/'+this.db+'/_schema/'+this.table
			}).success(function(data){
				deferred.resolve(data.result)
			}).error(function(e){
				deferred.reject(e)
			})
			return deferred.promise;
		}
		this.get = function(id){
			var deferred = $q.defer();
			$http.post(config.parse.root+'/functions/api', {
				method: 'GET',
				path: 	'/'+this.db+'/_table/'+this.table+'/'+id
			}).success(function(data){
				deferred.resolve(data.result)
			}).error(function(e){
				deferred.reject(e)
			})
			return deferred.promise;
		}
		this.query = function(query){
			var deferred = $q.defer();
			query = query || '';
			query = encodeURI(query);
			
			$http.post(config.parse.root+'/functions/api', {
				method: 'GET',
				path: 	'/'+this.db+'/_table/'+this.table+query
			}).success(function(data){
				deferred.resolve(data.result.resource)
			}).error(function(e){
				deferred.reject(e)
			})
			return deferred.promise;
		}

		it[db+table] = this;
	}
});
app.factory('Data', function ($q, ParseData) {
	var pl = [];
	return function(params){
		var defaults = {
			rootUrl: 	'https://api.parse.com/1/classes/',
			className: 	'TestData',
			query: 		null,	//Setup a specific query for the data.
			fireRef:	null, 	//Set fireRef for live and offline data...
			listener: 	'', 	//Will broadcast at this address when data changes.
			list: 		[],		//Will host a list of all results.
		}
		//If we want to be very simple and only pass in the class name:::
		if(typeof(params) != 'object')
			params = {className:params, fireRef:params}
		
		var ds = {};
		angular.extend(ds, defaults);
		angular.extend(ds, params);
		
		var parseData = null;
		for(var i=0; i<pl.length; i++)
			if(pl[i].className == ds.className && pl[i].fireRef == ds.fireRef)
				parseData = pl[i];
		if(!parseData){
			parseData = new ParseData(ds);
			pl.push(parseData);
		}
		it.pl = pl
		return parseData;
	}
});
app.factory('ParseData', function ($rootScope, $timeout, $http, $q, config, Auth) {
	var ParseData = function(params){
		//Extend this object so we can use it more simply within this service.
		var ds = this;
		angular.extend(this, params);
		
		this.start = true;
		this.deferred = $q.defer();
		if(this.fireRef){
			this.fire = Firebase.database().ref(this.fireRef)
			// this.fire = new Firebase(config.firebase+this.fireRef);
			this.listener = 'ds-'+this.fireRef;

			var local = localStorage.getItem(this.listener)
			if(local){
				local = angular.fromJson(local)
				this.updatedAt 	= local.updatedAt;
				this.list 		= local.list;
			}
		}
		
		//Setup the tools provided
		var tools = this.tools = {
			list: function(updateToken){
				if(!updateToken)
					updateToken = ds.updatedAt;
				if(!updateToken)
					updateToken = 'FirstTime';
				
				if(ds.start){
					ds.start = false;
					//Temporary try (added if-else for non-live -load on refresh- data)
					if(ds.fire){
						ds.fire.on('value', function(updateToken){
							ds.tools.list(updateToken.val()).then(function(list){
								$rootScope.$broadcast(ds.listener, list);
							})
						})
						tools.getUpdate(updateToken).then(function(list){
							ds.deferred.resolve(list);
						})
					}else{
						ds.tools.list().then(function(list){
							$rootScope.$broadcast(ds.listener, list);
						})
						tools.getUpdate(updateToken).then(function(list){
							ds.deferred.resolve(list);
						})
					}
					return ds.deferred.promise;
				}else{
					var deferred = $q.defer();
					ds.deferred.promise.then(function(){
						tools.getUpdate(updateToken).then(function(list){
							deferred.resolve(ds.list);
						})
					})
					return deferred.promise;
				}
			},
			getUpdate: function(updateToken){
				if(!updateToken)
					return console.error('You must provide an update token to get an upate..')
				var deferred = $q.defer();
				if(updateToken && updateToken == ds.updatedAt){
					deferred.resolve(ds.list);
				}else{	//Update the data.
					ds.updatedAt = updateToken;
					tools.live().then(function(list){
						ds.list = list;
						localStorage.setItem(ds.listener, angular.toJson({updatedAt: ds.updatedAt, list: ds.list}))
						deferred.resolve(ds.list);
					})
				}
				return deferred.promise;
			},
			local: function(){
				var deferred = $q.defer();
					deferred.resolve(ds.list);
				return deferred.promise;
			},
			live: function(){
				var deferred = $q.defer();
					var uri = ds.rootUrl+ds.className;
					if(ds.query)
						uri += ds.query;
					$http.get(uri).success(function(data){
						if(data.results){
							deferred.resolve(data.results);
						}else{
							deferred.reject(data)
						}
					})
				return deferred.promise;
			},
			broadcast: function(updateToken){
				if(!updateToken){
					updateToken = new Date();
					updateToken = updateToken.toISOString();
				}
				ds.fire.set(updateToken);
			},
			save: function(item){
				delete item.$$hashKey;
				if(item.objectId)
					return ds.tools.update(item);
				else
					return ds.tools.add(item);
			},
			add: function(item){
				var deferred = $q.defer();
				var temp = angular.copy(item);
				$http.post(ds.rootUrl+ds.className, temp).success(function(data){
					tools.broadcast(data.createdAt);
					deferred.resolve(data);
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			},
			update: function(item){
				var deferred = $q.defer();
				var temp = angular.copy(item);
				delete temp.createdAt;
				delete temp.updatedAt;
				delete temp.objectId;
				$http.put(ds.rootUrl+ds.className+'/'+item.objectId, temp).success(function(data){
					tools.broadcast(data.updatedAt);
					deferred.resolve(item);
				}).error(function(e){
					deferred.reject(e);
				})
				return deferred.promise;
			},
			delete: function(item){
				var deferred = $q.defer();
				if(confirm('Are you sure you want to delete this?')){
					var deletedAt = new Date();
					var updateToken = deletedAt.toISOString();
					$http.delete(ds.rootUrl+ds.className+'/'+item.objectId).success(function(){
						tools.broadcast(updateToken);
						deferred.resolve();
					}).error(function(error){
						//If there was an error, because the item could not be found:
						if(error.code == 101){
							tools.broadcast(updateToken);
							deferred.resolve();
						}
					});
				}else{
					deferred.resolve();
				}
				return deferred.promise;
			},
			addRelation: function(item){
				return {
					"__op": "AddRelation",
					"objects": [tools.ref(item)]
				}
			},
			removeRelation: function(item){
				return {
					"__op": "RemoveRelation",
					"objects": [tools.ref(item)]
				}
			},
			ref: function(item){
				var className = ds.className;
				if(className == 'users')
					className = '_User'
				if(className == 'roles')
					className = '_Role'
					
				return {
					"__type": "Pointer",
					"className": className,
					"objectId": item.objectId
				}
			},
			byRef: function(ref){
				var deferred = $q;
				ds.tools.list().then(function(items){
					for(var i=0; i<items.length; i++)
						if(ref.objectId == items[i].objectId)
							deferred.resolve(items[i]);
				})
				return deferred.promise;
			},
			byId: function(objectId){
				var deferred = $q.defer();
				ds.tools.list().then(function(items){
					for(var i=0; i<items.length; i++)
						if(objectId == items[i].objectId)
							deferred.resolve(items[i]);
				})
				return deferred.promise;
			},
			by: function(col, val){
				var deferred = $q.defer();
				ds.tools.list().then(function(items){
					var table = [];
					for(var i=0; i<items.length; i++)
						if(val == items[i][col])
							table.push(items[i]);
					deferred.resolve(table);
				})
				return deferred.promise;
			},
			liveId: function(objectId){
				for(var i=0; i<ds.list.length; i++)
					if(objectId == ds.list[i].objectId)
						return ds.list[i]
			},
			byIds: function(objectIds){
				var deferred = $q.defer();
				if(objectIds[0].objectId){
					deferred.resolve(objectIds);
				}else{
					var arrayResponse = [];
					ds.tools.list().then(function(items){
						for(var i=0; i<items.length; i++)
							if(objectIds.indexOf(items[i].objectId) != -1)
								arrayResponse.push(items[i])
						deferred.resolve(arrayResponse);
					})
				}
				return deferred.promise;
			}
		}
		
		it[this.className] = this;
	}
	it.ParseData = ParseData;
	return ParseData;
});
app.factory('Parse', function($rootScope, $http, $q, $timeout, config, Auth){
	var Parse = function(className, immediate, path){
		var ds = this;
		ds.className	= className;
		ds.immediate	= immediate;
		ds.path 		= path || config.parse.root+'/classes';
		ds.results 		= [];
		ds.schema = function(){
			var deferred = $q.defer();
			$http.get(config.parse.root+'/schemas/'+ds.className).success(function(data){
				deferred.resolve(data.results)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.list = function(){
			var deferred = $q.defer();
			if(ds.immediate)
				$http.get(ds.path+'/'+ds.className).success(function(data){
					ds.dataList = data.results;
					deferred.resolve(data.results)
				}).error(function(e){
					deferred.reject(e);
				})
			else
				Auth.init().then(function(){
					$http.get(ds.path+'/'+ds.className).success(function(data){
						ds.dataList = data.results;
						deferred.resolve(data.results)
					}).error(function(e){
						deferred.reject(e);
					})
				});
			return deferred.promise;
		}
		ds.query = function(query){
			query = query || '';
			var deferred = $q.defer();
			if(ds.immediate)
				$http.get(ds.path+'/'+ds.className+query).success(function(data){
					if(data.results){
						ds.dataList = data.results;
						deferred.resolve(data.results)
					}else{
						deferred.resolve(data)
					}
				}).error(function(e){
					deferred.reject(e);
				})
			else
				Auth.init().then(function(){
					$http.get(ds.path+'/'+ds.className+query).success(function(data){
						ds.dataList = data.results;
						deferred.resolve(data.results)
					}).error(function(e){
						deferred.reject(e);
					})
				});
			return deferred.promise;
		}
		ds.live = function(query, callback){
			function hash(str) {
				var hash = 0;
				if (!str || str.length == 0)
					return hash;
				for (var i = 0; i < str.length; i++) {
					var char = str.charCodeAt(i);
					hash = ((hash << 5) - hash) + char;
					hash = hash & hash;
					hash = hash.toString(16)
				}
				return hash;
			}
			
			var timer = false;
			var first = true;
			var local = localStorage.getItem(ds.className+'_'+hash(query))
			if(local){
				local = angular.fromJson(local)
				callback(local.data)
			}else{
				local = {};
			}
			
			var liveRef = Firebase.database().ref('/class/'+ds.className+'/updatedAt')
			liveRef.on('value', function(snapshot){
				if(!snapshot.val()){
					ds.query(query).then(function(data){
						callback(data)
					})
				}else{
					if(first){
						first = false;
						local.timestamp = snapshot.val().time;
						ds.query(query).then(function(data){
							local.data = data;
							localStorage.setItem(ds.className+'_'+hash(query), angular.toJson(local))
							callback(data)
						})
					}else{
						if(snapshot.val()){
							if(local.timestamp != snapshot.val().time){
								if(timer)
									$timeout.cancel(timer);
								timer = $timeout(function(){
									local.timestamp = snapshot.val().time;
									ds.query(query).then(function(data){
										local.data = data;
										localStorage.setItem(ds.className+'_'+hash(query), angular.toJson(local))
										callback(data)
									})
								}, 15000)
							}
						}else{
							ds.query(query).then(function(data){
								callback(data)
							})
						}
					}
				}
			}, function(e){
				console.log(e);
				ds.query(query).then(function(data){
					callback(data)
				})
			})
			$rootScope.$on('$locationChangeStart', function(event) {
				liveRef.off('value')
			});
		},
		ds.lookup = function(objectId){
			var deferred = $q.defer();
			deferred.resolve(ds.dataList.find(function(item){
				return item.objectId == objectId;
			}))
			return deferred.promise;
		},
		ds.get = function(objectId){
			var deferred = $q.defer();
			$http.get(ds.path+'/'+ds.className+'/'+objectId).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.batch = function(arr){
			var deferred = $q.defer();
			var requests = arr.map(function(item){
				delete item.createdAt;
				delete item.updatedAt;
				if(item.objectId){
					var method = 'PUT'
					var path = '/1/classes/'+ds.className+'/'+item.objectId;
					delete item.objectId;
				}else{
					var method = 'POST'
					var path = '/1/classes/'+ds.className
				}
				return {
					method: method,
					path: path,
					body: item
				}
			})
			$http.post(config.parse.root+'/batch', {requests: requests}).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.save = function(object){
			if(!object.objectId)
				return ds.new(object)
			else
				return ds.update(object)
		}
		ds.new = function(object){
			var deferred = $q.defer();
			object = angular.copy(object);
			delete object.objectId
			delete object.updatedAt
			delete object.createdAt
			$http.post(ds.path+'/'+ds.className, object).success(function(data){
				object = angular.extend(object, data);
				deferred.resolve(object)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.update = function(object){
			var deferred = $q.defer();
			var object2 = angular.copy(object);
			var objectId = object.objectId;
			delete object2.objectId
			delete object2.updatedAt
			delete object2.createdAt
			$http.put(ds.path+'/'+ds.className+'/'+objectId, object2).success(function(data){
				object2 = angular.extend(object, data);
				deferred.resolve(object2)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.delete = function(object){
			var deferred = $q.defer();
			$http.delete(ds.path+'/'+ds.className+'/'+object.objectId).success(function(data){
				deferred.resolve(data)
			}).error(function(e){
				deferred.reject(e);
			})
			return deferred.promise;
		}
		ds.pointer = function(item){
			var className = ds.className;
			if(className == 'users')
				className = '_User'
			if(className == 'roles')
				className = '_Role'
				
			return {
				"__type": "Pointer",
				"className": className,
				"objectId": item.objectId
			}
		}
		ds.ACL = {
			init: function(){
				if(!$rootScope.users){
					Auth.init().then(function(){
						$http.get(config.parse.root+'/classes/_User').success(function(data){
							$rootScope.users = data.results
						})
						$http.get(config.parse.root+'/classes/_Role').success(function(data){
							$rootScope.roles = data.results
						})
					});
				}
			},
			modal: function(object, message){
				object = object || {}
				var deferred = $q.defer();
				ds.ACL.init();
				$rootScope.ACL = {
					deferred: deferred,
					object: ds.ACL.unpack(object),
					message: message,
					tools: ds.ACL
				};
				$('#ACL').modal({
					keyboard: false,
					backdrop: 'static',
					show: true
				});
				return deferred.promise;
			},
			close: function(){
				var object = ds.ACL.pack($rootScope.ACL.object)
				$('#ACL').modal('hide');
				$rootScope.ACL.deferred.resolve(object)
			},
			add: function(type){
				if(!$rootScope.ACL.object.acl)
					$rootScope.ACL.object.acl = []
				$rootScope.ACL.object.acl.push({type:type})
			},
			remove: function(acl){
				var i = $rootScope.ACL.object.acl.indexOf(acl)
				$rootScope.ACL.object.acl.splice(i, 1)
			},
			verify: function(){
				//This will need to check to make sure the current user will still have access
				//If the current user will not have access, then prompt to see if they still 
				//want to set those permissions.
			},
			unpack: function(object){
				if(!object.ACL)
					return object;
				var keys = Object.keys(object.ACL)
				object.acl = [];
				keys.forEach(function(key){
					var acl = object.ACL[key]; //read write params
						acl.type = 'user';
					if(key.indexOf('*') != -1){
						acl.type = 'all';
						object.pAcl = acl;
					}else if(key.indexOf('role:') != -1){
						acl.type = 'role';
						key = key.replace('role:', '')
					}
					if(acl.type != 'all'){
						acl[acl.type] = key;
						object.acl.push(acl)
					}
				})
				return object;
			},
			pack: function(object){
				var acl = {'*':{},'role:Admin':{read:true,write:true}};
				if(!object.ACL)
					acl[Auth.objectId] = {
						read: true,
						write: true
					}
				if(object.pAcl){
					if(object.pAcl.read)
						acl['*'].read = object.pAcl.read
					if(object.pAcl.write)
						acl['*'].write = object.pAcl.write
				}
				if(object.acl)
					object.acl.forEach(function(item){
						if(item.role != 'Admin'){
							if(item[item.type]){
								var extension = '';
								if(item.type == 'role')
									extension = 'role:'
								acl[extension+item[item.type]] = {};
								if(item.read)
									acl[extension+item[item.type]].read = item.read
								if(item.write)
									acl[extension+item[item.type]].write = item.write
							}
						}
					})
				delete object.acl
				delete object.pAcl
				object.ACL = acl
				return object;
			}
		}
	}
	Parse.prototype.schema = function(){
		var deferred = $q.defer();
		$http.post('https://api.parse.com/1/functions/schema').success(function(data){
			deferred.resolve(data.result)
		})
		return deferred.promise;
	}
	return Parse;
}) //A simple shell for getting and saving data.

app.factory('SpreadSheet', function ($http, $q, Auth) {
	var SpreadSheet = function(spreadsheetId){
		var ss 			= this;
		this.id 		= spreadsheetId;
		this.ref		= null;
		this.title 		= null;
		this.author		= [];
		this.link 		= [];
		this.data 		= [];
		this.setId 		= function(id){
			this.id = id;
		}
		this.load 		= function(id){
			var deferred = $q.defer();
			if(id)
				this.setId(id);
			// this.ref = 'https://spreadsheets.google.com/feeds/list/'+this.id+'/1/public/values?alt=json-in-script&callback=JSON_CALLBACK';
			this.ref = 'https://spreadsheets.google.com/feeds/list/' + this.id + '/1/private/full?alt=json-in-script&access_token=' + Auth.gAuth.access_token+'&callback=JSON_CALLBACK';
			/*
				If content is not loading, make sure you publish the document and that the gid is equal to 0.
				If the gid in the url of the original spreadsheet si not 0, it will throw an error.
			*/
			$http.jsonp(this.ref).success(function(data){
				ss.title 	= data.feed.title.$t;
				ss.link 	= data.feed.link;
				ss.data 	= data.feed.entry;
				for(var i=0; i<data.feed.author.length; i++)
					ss.author.push({
						name: 	data.feed.author[i].name.$t,
						email: 	data.feed.author[i].email.$t
					})

				deferred.resolve(ss);
			});
			
			return deferred.promise;
		}
		this.columns = function(){
			var columns = [];
			var object = this.data[0];
			for (var property in object) {
				if (object.hasOwnProperty(property) && property.indexOf('gsx$') == 0) {
					columns.push(property.slice(4))
				}
			}
			return columns;
		}
		this.toTable = function(){
			var columns = this.columns();
			var table = [];
			for(var r=0; r<this.data.length; r++){
				table[r]=[];
				for(var c=0; c<columns.length; c++){
					table[r][c] = this.data[r]['gsx$'+columns[c]].$t
				}
			}
			return table;
		},
		this.toJson = function(row){
			var columns = this.columns();
			if(row != undefined){
				var item = {}
				for(var c=0; c<columns.length; c++){
					item[columns[c]] = this.data[row]['gsx$'+columns[c]].$t
				}
				return item;
			}else{
				var list = [];
				for(var r=0; r<this.data.length; r++){
					list[r]={};
					for(var c=0; c<columns.length; c++){
						list[r][columns[c]] = this.data[r]['gsx$'+columns[c]].$t
					}
				}
				return list;
			}
		}
	}

	it.SpreadSheet = SpreadSheet;
	return SpreadSheet;
});
app.factory('GeoService', function ($q) {
	var  GeoService={
		helpModal:function(){
			$('#userGeoHelpModal').modal('show');
		},
		location:function(){
			var deferred = $q.defer();
			if(navigator.geolocation){
				navigator.geolocation.getCurrentPosition(function(geo){
					deferred.resolve(geo)
				})
			}else{
				deferred.resolve({status:'error',message:'Geolocation is not supported by this browser.'});
			}
			return deferred.promise;
		},
		distance:function(geo1,geo2){
			var from = new google.maps.LatLng(geo1.latitude,geo1.longitude);
			var to = new google.maps.LatLng(geo2.latitude,geo2.longitude);
			var dist = google.maps.geometry.spherical.computeDistanceBetween(from, to);
			var miles = dist*.00062137;
			return miles;
		},
		parsePoint:function(geo){
			if(geo.coords)
				return {
					__type:"GeoPoint",
					latitude:geo.coords.latitude,
					longitude:geo.coords.longitude
				}
			else
				return {
					__type:"GeoPoint",
					latitude:geo.latitude,
					longitude:geo.longitude
				}
		},
		parseSearch:function(geoShape){
			var where = {};
			if(geoShape.type=='circle'){
				where={
					"location": {
						"$nearSphere": {
							"__type": "GeoPoint",
							"latitude": geoShape.latitude,
							"longitude": geoShape.longitude
						},
						"$maxDistanceInMiles": geoShape.radius
					}
				}
			}else if(geoShape.type=='rectangle'){
				where = {
					"location": {
						"$within": {
							"$box": [{
								"__type": "GeoPoint",
								"latitude": geoShape.northEast.latitude,
								"longitude": geoShape.northEast.longitude
							},{
								"__type": "GeoPoint",
								"latitude": geoShape.southWest.latitude,
								"longitude": geoShape.southWest.longitude
							}]
						}
					}
				}
			}else if(geoShape.type=='marker'){
				where={
					"location": {
						"$nearSphere": {
							"__type": "GeoPoint",
							"latitude": geoShape.latitude,
							"longitude": geoShape.longitude
						}
					}
				}
			}
			return where;
		}
	}
	it.GeoService = GeoService;
	return GeoService;
});
app.factory('Documents', function ($rootScope, $http, $q, Auth, Data, FileService) {
	var Docs		= Data({
		className: 	'Documents',
		query: 		'?order=-createdAt',
		fireRef:	'Documents'
	});
	
	Auth.tools.init().then(function(user){
		Docs.tools.list()
	});
	
	var Documents = {
		root: Docs,
		upload: function(file){
			var deferred = $q.defer();
			file.status = 'Uploading';
			FileService.upload(file.name, file.src).then(function(data) {
				file.status = 'Recording';
				var doc = {
					__type: "File",
					name: 	data._name,
					url: 	data._url
				}
				var entry = {
					file: doc,
					name: file.name
				}
				Docs.tools.save(entry).then(function(data){
					file.url = data.file.url;
					file.status = 'Complete'
					deferred.resolve(data);
				})
			});
			return deferred.promise;
		}
	}
	it.Documents = Documents;
	return Documents;
});



app.factory('Dados', function($q, $rootScope, $http, config, Auth){
	/*
		The purpose of this factory is to provide a simple interface between data and Parse.
		- Realtime updates
		- Offline Capable
		- Sync Ability
		- Dependent data modules
			If one data source referrs to a secondary data source, then it is necissary to resolve the dependancies first.
		- Provide immediate ID
		- 
	*/

	var parseUrl = config.parse.root+'/classes/';
	var ListaDeDados 	= [];
	var defaults 		= {
		className: 				'NewClass',
		dependencies: 			[],
		conflictResolution: 	function(parse, local){
			return local;
		}
	}
	
	function Connection(params){ //Used to create an actual instance of the connection.  Instance should not be called publicly.
		var ds = it['PC_'+params.className] = this;
			ds._deferred 		= $q.defer();
			ds._state 			= 'initial';
			// ds._fire 			= new Firebase(config.firebase+params.className);
			ds._fire 			= Firebase.database().ref('/class/'+params.className+'/updatedAt'),
			
			ds._params 			= params;
			ds.db 				= new PouchDB(ds._params.className, {auto_compaction: true});

		//GET LOCAL LIST FIRST
		ds.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
			ds.list = doc.rows;
		});
		//LISTEN FOR LOCAL CHANGES
		ds.db.changes({
			since: 'now',
				live: true,
				include_docs: true
			}).on('change', function(change) {
				ds.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
					ds.list = doc.rows;
				});
				$rootScope.$broadcast(ds._params.className, change.doc);
			});
		
		//LISTEN FOR REMOTE CHANGES
		ds._fire.on("child_added", function(snapshot) {
			if(ds._state !== 'initial'){
				var snap = snapshot.val();
				ds.db.get(snap.localId).then(function(doc){
					//Do nothing, already added
				}).catch(function(error){
					ds._state == 'remoteChange';
					privateTools.syncFromParse(snap);
				})
			}
		});
		ds._fire.on("child_removed", function(snapshot) {
			if(ds._state !== 'initial'){
				var snap = snapshot.val();
				ds.db.remove(snap.localId).then(function(doc){
					//Item has been removed from the db.
				}).catch(function(error){
					//Item never existed in this particular DB
				})
			}else{
				//Full sync is already in progress... re-check when done...
			}
		});
		ds._fire.on("child_changed", function(snapshot) {
			if(ds._state !== 'initial'){
				var snap = snapshot.val();
				ds.db.get(snap.localId).then(function(doc){
					if(doc.updatedAt !== snap.updatedAt){
						ds._state == 'remoteChange';
						if(doc._state == 'localChange'){
							privateTools.syncWithParse(doc);
						}else{
							privateTools.syncFromParse(doc);
						}
					}
				}).catch(function(error){
					//Item does not exist locally
					ds._state == 'remoteChange';
					privateTools.syncFromParse(snap)
				})
			}else{
				//Full sync is already in progress... re-check when done...
			}
		});
		
		var privateTools = {
			init: function(){
				ds.db.info().then(function (r) {
					if(r.doc_count == 0)
						privateTools.syncAllFromParse()
				})
			},
			waitForOthers: function(){
				var deferred = $q.defer();
				var promises = [];
				for(var i=0; i<ds.dependencies.length; i++)
					promises.push(ds.dependencies[i].upToDate())
				$q.all(promises).then(function(){
					deferred.resolve('Everyone is ready.');
				});
				return deferred.promise;
			},
			syncToParse: function(doc){
				var deferred = $q.defer();
				var item = angular.copy(doc);
				item.localId = item._id;
				item.revision = item._rev;
				delete item._id;
				delete item._rev;
				delete item.syncError;
				
				if(item.objectId){
					var objectId = item.objectId;
					delete item.objectId;
					delete item.updatedAt;
					delete item.createdAt;
					$http.put(parseUrl + ds._params.className + '/' + objectId, item).success(function(data) {
						item.objectId 	= doc.objectId;
						item.createdAt 	= doc.createdAt;
						item.updatedAt 	= data.updatedAt;
						item._id 		= item.localId;
						item._rev 		= item.revision;
						delete item.localId;
						delete item.revision;
						ds.db.put(item).then(function(r){
							ds._state = 'upToDate';
							$rootScope.$broadcast(ds._params.className, 'upToDate');
							var fireRef = ds._fire.child(item.objectId);
							fireRef.set({
								localDb: 	ds._params.className,
								objectId: 	item.objectId,
								localId: 	r.id,
								updatedAt: 	item.updatedAt,
							});
							deferred.resolve('Sync Complete');
						})
					}).error(function(e) {
						item.syncError 	= e;
						item._id 		= item.localId;
						item._rev 		= item.revision;
						delete item.localId;
						delete item.revision;
						ds.db.put(item)
						deferred.reject(e)
					})
					return deferred.promise;
				}else{
					$http.post(parseUrl + ds._params.className, item).success(function(data) {
						item.objectId 	= data.objectId;
						item.createdAt 	= data.createdAt;
						item.updatedAt 	= data.createdAt;
						item._id 		= item.localId;
						item._rev 		= item.revision;
						delete item.localId;
						delete item.revision;
						ds.db.put(item).then(function(r){
							ds._state = 'upToDate';
							$rootScope.$broadcast(ds._params.className, 'upToDate');
							var fireRef = ds._fire.child(item.objectId);
							fireRef.set({
								localDb: 	ds._params.className,
								objectId: 	item.objectId,
								localId: 	r.id,
								updatedAt: 	item.updatedAt,
							});
							deferred.resolve('Sync Complete');
						})
					}).error(function(e) {
						item.syncError 	= e;
						item._id 		= item.localId;
						item._rev 		= item.revision;
						delete item.localId;
						delete item.revision;
						ds.db.put(item)
						deferred.reject(e)
					})
				}
				return deferred.promise;
			},
			syncWithParse: function(doc){
				//get parse object
				//check for conflicts
				//save merged locally and remotly
			},
			syncFromParse: function(doc){
				$http.get('https://api.parse.com/1/classes/'+ds._params.className+'/'+doc.objectId).then(function(response){
					console.log('CR', doc, response)
					// Perform conflict resolution check
					// Save accordingly
				});
			},
			syncAllFromParse: function(){
				$http.get('https://api.parse.com/1/classes/'+ds._params.className).then(function(response){
					var promises = [];
					var list = response.data.results;
					for(var i=0; i<list.length; i++){
						promises.push((function(item){
							var deferred = $q.defer();
							var item = list[i]
							item._id = item.localId || item.objectId;
							ds.db.get(item._id).then(function(doc) {
								//if conflict run resolution
								//else do nothing.
							}).catch(function(error) {
								ds.db.put(item).then(function(r) {
									deferred.resolve(item);
								})
							})
							return deferred.promise;
						})(list[i]))
					}
					$q.all(promises).then(function(){
						ds._state = 'upToDate';
						$rootScope.$broadcast(ds._params.className, 'upToDate');
					})
				});
			},
			saveLocally: function(item){
				
			}
		}
		ds.upToDate = function(){
			var deferred = $q.defer();
			if(ds._state == 'upToDate')
				deferred.resolve();
			else
				$rootScope.$on(ds._params.className, function(event, data){
					if(data == 'upToDate')
						deferred.resolve();
				});
			return deferred.promise;
		}
		ds.tools = {
			// Listen, Sync, 
			item: {
				list: function(){
					var deferred = $q.defer();
					ds.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
						deferred.resolve(doc.rows);
					});
					return deferred.promise;
				},
				get: function(itemId){
					return ds.db.get(itemId)
				},
				save: function(item){
					var deferred = $q.defer();
					if(!item._id)
						item._id = Math.floor((Math.abs(Math.sin(moment().format('x')) * 2000000000000)) % 2000000000000).toString(36);
					ds._state = 'localChange';
					ds.db.put(item).then(function(r){
						ds.db.get(item._id).then(function(doc){
							privateTools.syncToParse(doc).then(function(result){
								alert('Saved Successfully!')
							}, function(error){
								console.error(error);
							})
						})
					})
					return deferred.promise;
				},
				delete: function(item){
					
				}
			},
			relation: function(){
				
			},
			pointer: function(){
				
			},
			permission: function(){
				
			},
			destroy: function(){
				if(confirm('Are you sure you want to destroy this DB?  All data could be lost.')){
					ds.db.destroy()
				}
			}
		}
		privateTools.init();
		return ds;
	}

	
	var Dados = {
		data: function(){
			
		},
		list: function(){ //returns a list of all registered data objects.
			return ListaDeDados;
		},
		connection: function(params){ //Used to create a new connection.
			if(typeof(params) != 'object')
				params = angular.extend(defaults, {className: params})
			if(!ListaDeDados[params.className])
				ListaDeDados[params.className] = new Connection(params);
				
			return ListaDeDados[params.className];
		},
		acl: {
			
		}
	}
	return Dados;
});


app.factory('Google',  function($q, $http, config, Auth){
	var user = false;
	var auth = false;
	var load = {};

	var tools = {
		request: function(path, data, method){
			method = method || 'POST'
			var deferred = $q.defer();
			$http({
				method: method,
				url: path,
				headers: {
					Authorization: 'Bearer '+Auth.gAuth.access_token
				},
				data: data
			}).then(function(r){
				deferred.resolve(r.data);
			}, function(e){
				deferred.reject(e.data.error);
			})
			return deferred.promise;
		},
		auth: {
			access: function(scope){
				var deferred = $q.defer();
				window.gapi.auth.authorize({
					'client_id': config.google.client_id,
					'scope': scope,
					'immediate': false
				},
				function(authResult){
					if(authResult && !authResult.error){
						auth = authResult;
						deferred.resolve(auth);
					}else{
						deferred.reject('There was an error authorizing.');
					}
				});
				return deferred.promise;
			}
		},
		drive: {
			picker: {
				load: function(scope){
					var deferred = $q.defer();
					if(load.picker)
						deferred.resolve();
					else
						tools.auth.access(scope).then(function(){
			        		window.gapi.load('picker', {'callback': function(){
			        			load.picker = true;
			        			deferred.resolve();
			        		}});
						});
		        	return deferred.promise;
				},
				generate: function(number){
					number = number || 1;
					var deferred = $q.defer();
					var type = 'https://www.googleapis.com/auth/drive';
					tools.drive.picker.load(type).then(function(){
						var uploadView = new google.picker.DocsUploadView();
		        		var picker = new google.picker.PickerBuilder().
		        		addView(google.picker.ViewId.DOCS).
		        		addView(uploadView).
		        		setOAuthToken(auth.access_token).
		        		enableFeature(google.picker.Feature.MULTISELECT_ENABLED).
		        		setMaxItems(number).
		        		// setDeveloperKey(config.google.browser_key).
		        		setCallback(function(data){
		        			if(data.action == 'picked')
		        				deferred.resolve(data);
		        		}).
		        		build();
		        		picker.setVisible(true);
					})
		        	return deferred.promise;
				}
			},
			permission: {
				set: function(fileId, permission){
					var url = 'https://www.googleapis.com/drive/v3/files/'+fileId+'/permissions?sendNotificationEmail=false'
					return tools.request(url, permission)
				}
			}
		},
		calendar: {
			list: function(minAccessRole){
				var deferred = $q.defer();
				$http.post(config.parse.root + '/functions/CalendarList', {
					minAccessRole: minAccessRole
				}).success(function(data) {
					deferred.resolve(data.result.items);
				})
				return deferred.promise;
			}
		}
	}
	return tools;
});
app.factory('Cloudinary', function(){
	var tools = {
		resize: function(src, width, height, style){
			style = style || 'c_fill'
			if(src){
				src = src.split('upload')
				src =  src[0]+'upload/w_'+width+',h_'+height+','+style+src[1]
			}else{
				src = null;
			}
			return src;
		}
	}
	return tools;
});