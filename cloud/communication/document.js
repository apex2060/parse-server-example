var CONFIG = require('cloud/config.js');
var _ = require('underscore');




var rootURI = 'https://api.cloudinary.com/v1_1/'+CONFIG.KEY.CLOUDINARY.cloud_name+'/';

var DOC = {	
	request: function(extention, params, method){
		method = method || 'POST';
		// params = _.extend(defaults, params);
		var promise = new Parse.Promise();
		Parse.Cloud.httpRequest({
			method: method,
			url: rootURI+extention,
			body: params
		}).then(function(httpResponse){
			promise.resolve(httpResponse.data);
		}, function(e){
			promise.reject(e);
		});
		return promise;
	},
	uploadFax: function(title, file, folder){
		var promise = new Parse.Promise();
		var uploadPreset = CONFIG.KEY.CLOUDINARY.fax_preset;
		var timestamp = new Date().getTime();
		var crypto = require('crypto'),
			shasum = crypto.createHash('sha1');
		shasum.update("timestamp="+timestamp+'&upload_preset='+uploadPreset+CONFIG.KEY.CLOUDINARY.api_secret);
		var request = {
			api_key: CONFIG.KEY.CLOUDINARY.api_key,
			signature: shasum.digest('hex'),
			timestamp: timestamp,
			file: file,
			upload_preset: uploadPreset
		}
		DOC.request('image/upload', request).then(function(r){
			var Docs = Parse.Object.extend("Docs");
			var doc = new Docs();
			var img_url = r.secure_url.replace('.pdf', '.jpg')
			var pdf_url = r.secure_url.replace('.jpg', '.pdf')
				pdf_url = pdf_url.replace('.png', '.pdf')
				pdf_url = pdf_url.replace('.tiff', '.pdf')
			
			doc.set('title', title)
			doc.set('cloudinary', r)
			doc.set('pdf_url', pdf_url)
			doc.set('img_url', img_url)
			if(folder){
				folder.fetch().then(function(folder){
					doc.set('folder', folder)
					doc.set('ACL', folder.get('ACL'))
					doc.save().then(function(doc){
						promise.resolve(doc);
					}, function(e){
						console.error('54')
						console.error(e)
						promise.reject(e);
					})
				})
			}else{
				doc.save().then(function(doc){
					promise.resolve(doc);
				}, function(e){
					console.error('54')
					console.error(e)
					promise.reject(e);
				})
			}
		}, function(e){
			console.error('59')
			console.error(e)
			promise.reject(e);
		})
		// var Docs = Parse.Object.extend("Docs");
		// var doc = new Doc();
		// return doc.save()
		return promise;
	},
}
exports.uploadFax = DOC.uploadFax;