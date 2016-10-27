var CONFIG 		= require('cloud/config.js');
var Buffer = require('buffer').Buffer;

var auth = 'Basic ' +new Buffer(CONFIG.KEY.STRIPE).toString('base64');

var Stripe = {
	request: function(extension, params, method){
		method = method || 'POST';
		var promise = new Parse.Promise();
		var request = {
			method: method,
			url: 'https://api.stripe.com/v1'+extension,
			headers: {
				'Authorization': auth,
				'User-Agent': 'ParseStripe',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
		}
		if(params)
			request.body = params;

		Parse.Cloud.httpRequest(request).then(function(httpResponse){
			if(httpResponse.data)
				promise.resolve(httpResponse.data);
			else
				promise.reject(httpResponse);
		}, function(e){
			promise.reject(e);
		});
		return promise;
	},
	customers: {
		list: function(){
			
		},
		create: function(params){
			return Stripe.request('/customers', params, 'POST');
		},
		get: function(){
			
		},
		update: function(){
			 
		}
	},
	charges: {
		create: function(params){
			return Stripe.request('/charges', params, 'POST');
		}
	},
	plans: {
		create: function(params){
			return Stripe.request('/plans', params, 'POST');
		}
	},
	subscriptions: {
		create: function(params){
			return Stripe.request('/subscriptions', params, 'POST');
		}
	}
}
var tools = {
	createCustomer: function(params){
		var promise = new Parse.Promise();
		var user = Parse.User.current();
		if(!user){
			promise.reject('You must be logged in first.')
		}else{
			var StripeCustomer = Parse.Object.extend("StripeCustomer");
			var customer = new StripeCustomer();
				customer.set('user',			user)
				customer.set('description', 	params.description)
				customer.set('email', 			params.email)
				customer.set('stripeId', 		params.id)
				customer.set('liveMode', 		params.liveMode)
				customer.set('metadata', 		params.metadata)
				customer.set('shipping', 		params.shipping)
				customer.set('sources', 		params.sources)
				customer.set('subscriptions', 	params.subscriptions)
			customer.save(null, {
				success: function(customer){
					user.set('stripe', customer)
					user.save(null, {success:function(u){
						promise.resolve(customer)
					}, error: function(e){
						promise.reject(e)
					}})
				}, error: function(o, e){
					promise.reject(e)
				}
			})
		}
		return promise;
	},
	createTransaction: function(params){
		var promise = new Parse.Promise();
		var rejection = false
		var user = Parse.User.current();
		if(user)
			var stripe = user.get('stripe');
		
		if(!user)
			rejection = 'There is no current user session.'
		if(!stripe)
			rejection = 'No Stripe account on file for this user.'
		if(!params.amount)
			rejection = 'You must specify an -amount- to charge.  250 = $2.50'
		if(!params.currency)
			rejection = 'You must specify a -currency- type.  USD, EUR...'
		
		
		if(rejection){
			return promise
			promise.reject(rejection)
		}
	
	
		stripe.fetch().then(function(stripe){
			var StripeTransaction = Parse.Object.extend("StripeTransaction");
			var transaction = new StripeTransaction();
				transaction.set('user', 			user)
				transaction.set('stripe', 			stripe)
				transaction.set('stripeId', 		stripe.get('stripeId'))
				transaction.set('amount', 			params.amount) 			//0 decimal (250 = $2.50)
				transaction.set('currency', 		params.currency) 		//support.stripe.com/questions/which-currencies-does-stripe-support
				transaction.set('description', 		params.description)
				transaction.set('details', 			params.details)
				transaction.set('status', 			'pending')
			transaction.save(null, {
				success: function(obj){
					promise.resolve(obj)
				}, error: function(o, e){
					promise.reject(e)
				}
			})
		})
		return promise;
	},
	createPlan: function(params){
		//create object first
		var promise = new Parse.Promise();
		var user = Parse.User.current();
			
		var rejection = false;
		if(!user)
			rejection = 'There is no current user session.'
		if(!params.amount)
			rejection = 'You must specify an -amount- to charge:  250 = $2.50'
		if(!params.currency)
			rejection = 'You must specify a -currency- type:  USD, EUR...'
		if(!params.interval)
			rejection = 'You must specify an -interval- type: day, week, month, year'
		if(!params.name)
			rejection = 'You must specify a -name- description:  Sample Subscription'
		
		
		if(rejection){
			return promise
			promise.reject(rejection)
		}
		
		
		var StripePlans = Parse.Object.extend("StripePlans");
		var plan = new StripePlans();
			plan.set('user', 					user)
			plan.set('amount', 					params.amount)
			plan.set('currency', 				params.currency)
			plan.set('interval', 				params.interval)
			plan.set('name', 					params.name)
			plan.set('interval_count', 			params.interval_count)
			plan.set('statement_descriptor', 	params.statement_descriptor)
			plan.set('trial_period_days', 		params.trial_period_days)
		plan.save(null, {
			success: function(plan){
				params.id = plan.id
				Stripe.plans.create(params).then(function(r){
					promise.resolve(r);
				}, function(e){
					promise.reject(e);
				})
			}, error: function(plan, e){
				promise.reject(e)
			}
		})
		return promise;
	},
	createSubscription: function(plan){
		//create object first
		var promise = new Parse.Promise();
		var user = Parse.User.current();
		if(user)
			var stripe = user.get('stripe');
		
		var rejection = false;
		if(!user)
			rejection = 'There is no current user session.'
		if(!stripe)
			rejection = 'No Stripe account on file for this user.'
		if(!plan)
			rejection = 'You must specify a plan'
		
		
		if(rejection){
			return promise
			promise.reject(rejection)
		}
		
		
		stripe.fetch().then(function(stripe){
			var obj = {
				customer: stripe.get('stripeId'),
				plan: plan.objectId
			}
			Stripe.subscriptions.create(obj).then(function(r){
				var StripeSubscription = Parse.Object.extend("StripeSubscription");
				var subscription = new StripeSubscription();
					subscription.set('user', 			user)
					subscription.set('stripe', 			stripe)
					subscription.set('stripeId', 		stripe.get('stripeId'))
					subscription.set('plan', 			{__type: "Pointer", className: "StripePlan", objectId: plan.objectId})
					subscription.set('planId', 			plan.objectId)
					subscription.set('details', 		r)
				subscription.save(null, {
					success: function(subscription){
						promise.resolve(subscription)
					}, error: function(plan, e){
						promise.reject(e)
					}
				})
			}, function(e){
				promise.reject(e)
			})
		});
		return promise;
	},
}


Parse.Cloud.define('stripeSignup', function(request, response) {
	var obj = {
		description: 	'New User Account',
		email: 			request.params.email,
		source: 		request.params.id,
	}
	Stripe.customers.create(obj).then(function(result){
		tools.createCustomer(result).then(function(r){
			response.success(r)
		}, function(e){
			response.error(e)
		})
	},function(e){
		response.success(e)
	})
});

Parse.Cloud.define('stripeCheckout', function(request, response) {
	tools.createTransaction(request.params).then(function(transaction){
		var obj = {
			amount: 				transaction.get('amount'),
			currency: 				transaction.get('currency'),
			description: 			transaction.get('description'),
			customer: 				transaction.get('stripeId'),
			// statement_descriptor: 	transaction.get('statement_descriptor'),
		}
		
		Stripe.charges.create(obj).then(function(result){
			transaction.set('status', result.status)
			transaction.set('log', result)
			transaction.save(null, {success:function(r){
				response.success(r)
			}, error: function(e){
				response.error(e)
			}})
		}, function(e){
			response.success(e)
		})
	}, function(e){
		response.error(e)
	})
});


Parse.Cloud.define('stripePlan', function(request, response) {
	//requires: amount, currency, interval, name
	tools.createPlan(request.params).then(function(r){
		response.success(r)
	}, function(e){
		response.error(e)
	})
});

Parse.Cloud.define('stripeSubscribe', function(request, response) {
	//requires plan
	tools.createSubscription(request.params).then(function(r){
		response.success(r)
	}, function(e){
		response.error(e)
	})
});