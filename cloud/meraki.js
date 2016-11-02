var moment 		= require('moment'),
	GOOGLE 		= require('./cloud/google.js')

exports.locations = function(request, response) {
	Parse.Cloud.useMasterKey();
	var MerakiVistas = Parse.Object.extend("MerakiVistas");
	function observe(location, observed) {
		observed.seenDate = moment(Date(observed.seenEpoch)).toDate()
		var deferred = new Parse.Promise();
		
		var query = new Parse.Query(MerakiVistas);
		query.equalTo("clientMac", observed.clientMac);
		query.first({
			success: function(vista) {
				var existed = true;
				if(!vista){
					existed = false;
					var vista = new MerakiVistas();
					vista.set('clientMac', 		observed.clientMac)
					vista.set('os', 			observed.os)
					vista.set('manufacturer', 	observed.manufacturer)
					vista.set('arrivalDate', 	observed.seenDate)
					vista.set('status', 		'new')
				}else{
					var frequency = vista.get('frequency')+1 || 1;
					vista.set('frequency', frequency)
				}
				var origStatus = vista.get('status');
				
				if(origStatus == 'offline'){
					vista.set('arrivalDate', observed.seenDate)
					vista.add('offline', {
						fromTime: 	vista.get('seenDate'),
						toTime: 	observed.seenDate,
						duration: 	moment(observed.seenDate).diff(moment(vista.get('seenDate')))
					})
				}
				
				if(vista.get('location') && vista.get('location') != location){
					var fromTime = observed.seenDate
					vista.set('arrivalDate', observed.seenDate)
					vista.set('status', 'moved')
					vista.add('history', {
						left: 		vista.get('location'),
						leftAt: 	vista.get('seenDate'),
						arrived: 	location,
						arrivedAt: 	observed.seenDate,
						duration: 	moment(observed.seenDate).diff(moment(vista.get('seenDate')))
					})
				}else if(existed){
					if(origStatus == 'offline')
						vista.set('status', 'returned')
					else
						vista.set('status', 'static');
				}
				
				var geo = new Parse.GeoPoint({latitude: observed.location.lat, longitude: observed.location.lng});
				vista.set('ipv4', 		observed.ipv4)
				vista.set('geo', 		geo)
				vista.set('seenDate', 	observed.seenDate);
				vista.set('location', 	location)
		
				vista.save(null, function(v){
					deferred.resolve(v);
				})
			}
		});
		return deferred;
	}
	function observations(request){
		var observations 	= request.body.data.observations
		var location 		= request.body.secret.split('-')[1];

		var promises = [];
		for(var i=0; i<observations.length; i++)
			promises.push(observe(location, observations[i]))
		return Parse.Promise.when(promises)
	}
	
	if(request.body){
		var secret = request.body.secret.split('-')[0];
		if(secret == '1221'){
			observations(request).then(function(result){
				if(result){
					GOOGLE.tools.firebase.set('/class/MerakiVistas/updatedAt/', {time:result.updatedAt}).then(function(r){
						response.send('Thanks');
					}, function(e){
						response.send(e)
					})
				}else{
					response.send('Thanks');
				}
			})
		}else{
			response.send('Interesting')
		}
	}else{
		response.send('Okay');
	}
}

Parse.Cloud.job("merakiVistaOffline", function(request, response){
	Parse.Cloud.useMasterKey();
	var MerakiVistas = Parse.Object.extend("MerakiVistas");
	var query = new Parse.Query(MerakiVistas);
	
	var d = new Date();
	var time = (15 * 60 * 1000); //15 minutes
	var expirationDate = new Date(d.getTime() - (time));

	query.lessThanOrEqualTo("seenDate", expirationDate);
	query.notEqualTo("status", 'offline');
	query.find({
		success: function(results) {
			var promises = [];
			for (var i=0; i<results.length; i++)
				promises.push((function(observation){
					var seenDate = observation.get('arrivalDate')
					var leaveDate = moment().toDate();
					observation.set('status', 'offline');
					observation.set('leaveDate', leaveDate)
					observation.add('online', {
						location:	observation.get('location'),
						fromTime: 	seenDate,
						toTime: 	leaveDate,
						duration: 	moment(leaveDate).diff(moment(seenDate))
					})
					return observation.save()
				}(results[i])))
				
			Parse.Promise.when(promises).then(function(){
				response.success('Job completed modifying: '+results.length+' rows.');
			})
		},
		error: function(e) {
			console.error(e);
			response.error("meraki lookup failed");
		}
	});
});
Parse.Cloud.job("merakiVistaClean", function(request, response) {
	Parse.Cloud.useMasterKey();
	var MerakiVistas = Parse.Object.extend("MerakiVistas");
	var fewQry = new Parse.Query(MerakiVistas);
	fewQry.lessThanOrEqualTo("frequency", 4);
	
	var noQry = new Parse.Query(MerakiVistas);
	noQry.doesNotExist("frequency");
	
	var oldQry = new Parse.Query(MerakiVistas);
	var d = new Date();
	var todaysDate = new Date(d.getTime()); 
	oldQry.greaterThanOrEqualTo("seenDate", todaysDate);

	var query = Parse.Query.or(fewQry, noQry, oldQry);
	query.limit(1000);
	query.find({
		success: function(results) {
			var promises = [];
			for (var i=0; i<results.length; i++)
				promises.push((function(observation){
					return observation.destroy();
				}(results[i])))
				
			Parse.Promise.when(promises).then(function(){
				response.success('Job completed removing: '+results.length+' rows.');
			})
		},
		error: function() {
			response.error("meraki lookup failed");
		}
	});
});