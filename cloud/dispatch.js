var CONFIG 		= require('./cloud/config.js'),
	GOOGLE 		= require('./cloud/google.js'),
	moment 		= require('moment')
//www.insta-mapper.com/api-guide/

var DISPATCH  = {
	sync: function(request, status){
		function getEquip(){
			var promise = new Parse.Promise();
			var url= 'http://ww2.insta-mapper.com/api/api_multi.php?key='+CONFIG.KEY.DISPATCH.key_id+'&device_id='+CONFIG.KEY.DISPATCH.device_id+'&latest=1'
			 Parse.Cloud.httpRequest({
			 	method: 'GET',
			 	url: url
			 }).then(function(result) {
			 	promise.resolve(result.data)
			 }, function(e) {
			 	promise.reject(e)
			 })
			 return promise
		}
		function upsert(eq){
			var promise = new Parse.Promise();
			var DispatchFleet = Parse.Object.extend("DispatchFleet");
			
			var query = new Parse.Query(DispatchFleet);
			query.equalTo("device_id", eq.device_id);
			
			query.first({
				success: function(equip) {
					equip = equip || new DispatchFleet();
					var point = new Parse.GeoPoint({latitude: parseFloat(eq.lat), longitude: parseFloat(eq.lng)});
					
					equip.set('device_id', 		eq.device_id)
					equip.set('geo', 			point)
					equip.set('dateTime', 		eq.Datetime)
					equip.set('seenDate', 		new Date(eq.Datetime))
					equip.set('title', 			eq.friendly_name)
					equip.set('speed', 			parseFloat(eq.speed))
					equip.set('altitude', 		parseFloat(eq.altitude))
					equip.set('accuracy', 		parseFloat(eq.accuracy))
					equip.set('heading', 		parseFloat(eq.heading))
					equip.set('battery', 		parseFloat(eq.battery))
					equip.save(null, {
						success: function(r){
							promise.resolve(r);
						},
						error: function(e){
							console.error(e);
							promise.reject(e);
						}
					})
				}
			});
			return promise
		}
		getEquip().then(function(equipment){
			equipment = equipment || [];
			var promises = []
			equipment.forEach(function(eq){
				promises.push(upsert(eq))
			})
			Parse.Promise.when(promises).then(function(result) {
				GOOGLE.tools.firebase.set('/class/DispatchFleet/updatedAt/', {time:result.updatedAt}).then(function(r){
					status.success('Dispatch Sync Complete')
				}, function(e){
					status.error(e)
				})
			}, function(e){
				status.error(e)
			})
		})
	},
	singleRoute: function(request, response) {
		var user = Parse.User.current();
		if(!user)
			response.error('You are not authenticated.')
		var url= 'http://ww2.insta-mapper.com/api/api_single.php?key='+CONFIG.KEY.DISPATCH.key_id+'&device_id='+request.params.device_id+'&num=250'
		Parse.Cloud.httpRequest({
			method: 'GET',
			url: url
		}).then(function(result) {
			response.success(result.data)
		}, function(e) {
			response.error(e)
		})
	},
}

Parse.Cloud.job("syncDispatch", DISPATCH.sync);
Parse.Cloud.define('singleRoute', DISPATCH.singleRoute);