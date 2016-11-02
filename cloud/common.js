var moment = require('moment'),
	CONFIG = require('./cloud/config.js')
 
exports.savedBy = function(request){
	console.log(request.User)
	if(!request.object.existed())
		request.object.set('createdBy', request.User);
	else
		request.object.set('updatedBy', request.User);
}
exports.autoIncrement = function(className, request, callback){
	var column = 'number';
	if(!request.object.existed()){
		var currentDate = new Date();
		var query = new Parse.Query(className);
		query.descending("number");
		query.first({
			success: function(result) {
				var num = 0;
				if(result && result.get(column))
					num = result.get(column);
				request.object.set(column, ++num);
				callback();
			},
			error: function() {
				callback();
			}
		});
	}else{
		callback();
	}
}
 
exports.backup = function(className, backup, request, callback){
	if(request.object.existed()){
		var prev = new Parse.Query(className);
		prev.get(request.object.id, {
			success: function(obj) {
				var history = {};
				for(var i=0; i<backup.length; i++)
					history[backup[i]] = obj.get(backup[i]);
				delete history.history;
				request.object.add('history', history);
				callback();
			}, error: function(obj, e){
				console.error(obj);
				console.error(e);
			}
		});
	}else{
		callback();
	}
}
 
exports.interpolate = function(template, data){
	if(!template || !data)
		return '';
	var mod 	= '--'+template+'--';
		mod 	= mod.split('{{');
	var vars 	= [];
	
	for(var i=1; i<mod.length; i++)
		vars.push(mod[i].split('}}')[0])
	
	function bid(template, data, origPath, path){
		console.log(template)
		console.log(data)
		console.log(origPath)
		console.log(path)
		path = path || origPath;
		if(!template || !data || !origPath)
			return template;
		
		var vars = path.split('.');
		if(vars.length == 1){
			console.log(data[path])
			if(!data[path])
				return template
			else
				return template.replace('{{'+origPath+'}}', data[path])
		}else{
			console.log('datalength > 1')
			data = data[vars.shift()]
			path = vars.join('.')
			return bid(template, data, origPath, path)
		}
	}
	for(var i=0; i<vars.length; i++)
		template = bid(template, data, vars[i])
	console.log(template)
	return template
}
//NOT WORKING
// exports.broadcast = function(fireRef, callback){
//  var updatedAt = new Date();
//  var timestamp = updatedAt.toISOString();
	 
//  var request = {}
//      request[fireRef] = timestamp;
//  Parse.Cloud.httpRequest({
//      method: 'PUT',
//      headers: {
//          'Content-Type': 'application/json',
//      },
//      url: CONFIG.FIREBASE_URL+'/rideList.json?auth='+CONFIG.FIREBASE_KEY,
//      body: request,
//      success: function(httpResponse) {
//          console.log(httpResponse.text);
//          callback()
//      },
//      error: function(httpResponse) {
//          console.error('Request failed with response code ' + httpResponse.status);
//          callback();
//      }
//  });
// }