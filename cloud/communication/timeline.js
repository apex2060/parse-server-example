var CONFIG 	= require('./cloud/config.js')

var tools = {
	upsert: function(event, object, user){
		var promise = new Parse.Promise();
			user = user || Parse.User.current();
		var Timeline = Parse.Object.extend("Timeline");
		
		var query = new Parse.Query(Timeline);
		query.equalTo(event, object);
		query.first({
			success: function(timeline){
				if(!timeline){
					timeline = new Timeline;
					timeline.set('user', user);
					timeline.set('type', event);
					timeline.set(event, object);
				}else{
					timeline.set('user', user);
					//update ACL here (in case a call was transfered etc...)
				}
				timeline.save(null, {
					success: function(r){
						promise.resolve(r);
					}, error: function(r, e){
						promise.reject(e);
					}
				})
			}, error: function(e){
				promise.reject(e)
			}
		})
		return promise;
	}
}

exports.tools = tools;