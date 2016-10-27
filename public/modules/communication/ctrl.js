app.lazy.controller('CommunicationCtrl', function($scope, $routeParams, $http, $timeout, $sce, Auth, Parse, Cloudinary, config){
	$scope.moment = moment;
	$scope.comOptions = ['call', 'sms', 'fax']
	var PhoneNumbers = new Parse('PhoneNumbers');
	var FaxNumbers = new Parse('FaxNumbers');
	var Timeline = new Parse('Timeline');
	var Comm = {
		Faxes: 			new Parse('Faxes'),
		PhoneCalls: 	new Parse('PhoneCalls'),
		SMS:			new Parse('SMS'),
		Emails:			new Parse('Emails')
	}
	
	var tools = $scope.tools = {
		init: function(){
			PhoneNumbers.list().then(function(phoneNumbers){
				$scope.phoneNumbers = phoneNumbers
			})
			FaxNumbers.list().then(function(faxNumbers){
				$scope.faxNumbers = faxNumbers
			})
			var live = Firebase.database().ref('/class/PhoneCalls')
			// var live = new Firebase(config.firebase+'/class/PhoneCalls');
			it.live = live;
			live.on('value', function(ds){
				tools.timeline.update();
			})
		},
		view: function(view){
			if(view || !$scope.view)
				$scope.view = view || 'timeline';
			return '/modules/communication/views/'+$scope.view+'.html';
		},
		new: function(type){
			if(type == 'options' && $scope.newComm && $scope.newComm.show)
				$scope.newComm.show = false;
			else
				$scope.newComm = {
					show: true,
					type: type,
					data: {}
				}
		},
		addImage: function(item, attr){
			cloudinary.openUploadWidget({
				cloud_name: $scope.config.cloudinary.name,
				upload_preset: $scope.config.cloudinary.preset,
				theme: 'white',
				multiple: false,
			},
			function(error, result) {
				if (result)
					item[attr] = {
						etag: 			result[0].etag,
						public_id: 		result[0].public_id,
						trusted_url: 	$sce.trustAsResourceUrl(result[0].secure_url),
						secure_url: 	result[0].secure_url,
						thumbnail_url: 	result[0].thumbnail_url,
						url: 			result[0].url
					}
				$scope.$apply();
			});
		},
		timeline: {
			iframe: function(event){
				return $sce.trustAsResourceUrl(event[event.type].attachment.secure_url)
			},
			recording: function(event){
				try{
					return $sce.trustAsResourceUrl(event[event.type].recording.url)
				}catch(e){}
			},
			status: function(event){
				var options = {
					'cancel': 		'panel-danger',
					'ringing': 		'panel-info',
					'in-progress': 	'panel-success',
					'answer':		'panel-success',
					'completed': 	'panel-default'
				}
				return options[event[event.type].status]
			},
			update: function(){
				Timeline.query('?include=Faxes,PhoneCalls.recording&order=-createdAt&where={"archive":{"$ne":true}}').then(function(timeline){
					$scope.timeline = timeline;
				})
			},
			archive: function(event){
				var e2 = angular.copy(event);
				e2[e2.type] = Comm[e2.type].pointer(e2[e2.type]);
				e2.archive = true;
				Timeline.save(e2).then(function(result){
					var i = $scope.timeline.indexOf(event)
					$scope.timeline.splice(i, 1)
				}, function(e){
					toastr.error(e);
				})
			}
		},
		sms: {
			send: function(data){
				$scope.sendTextResult = {status: 'Processing...'};
				function formatTo(num) {
					if (num.length == 7)
						num = data.localNumber.substr(0, 3) + num
					else if (num.length == 4)
						num = data.localNumber.substr(0, 6) + num
					return num;
				}
				if(!data.localNumber || !data.remoteNumber || !data.message){
					toastr.error('You must fill in the information to send a message.')
				}else{
					data.remoteNumber = formatTo(data.remoteNumber)
					Comm.SMS.save(data).then(function(result){
						toastr.success('Sending SMS...');
						tools.timeline.update();
					}, function(e){
						console.error(e)
					})
				}
			}
		},
		fax: {
			send: function(data){
				$scope.sendFaxResult = {status: 'Processing...'};
				function formatTo(num) {
					if (num.length == 7)
						num = data.localNumber.substr(0, 3) + num
					else if (num.length == 4)
						num = data.localNumber.substr(0, 6) + num
					return num;
				}
				if(!data.localNumber || !data.remoteNumber || !data.attachment){
					toastr.error('You must fill in the information to send a fax.')
				}else{
					data.remoteNumber = formatTo(data.remoteNumber)
					Comm.Faxes.save(data).then(function(result){
						toastr.success('Sending Fax...')
						$timeout(function(){
							toastr.info('Remember those old days when faxes were amazing but took 5 minutes to go through?  Yeah, they probably still have one of those old machines, so it may take some time.', 'Bam!', {timeOut: 5000})
						}, 1500)
						tools.timeline.update();
					}, function(e){
						console.error(e)
					})
				}
			}
		},
		snail: {
			routes: function(zip){
				$http.post(config.parse.root+'/functions/snailRoutes', {zip:zip}).success(function(data){
					$scope.routes = data.result;
				})
			},
			postcard: {
				prep: function(imgUrl){
					var width = '2500'
					var height = '1700'
					if(imgUrl)
						return Cloudinary.resize(imgUrl, width, height)
				}
			},
			send: function(data){
				//[] Get addresses from Google contacts || directory
				//[] Allow user to specify media type [postcard, letter]
				//[] Allow users to choose from pre-saved options (front & back)
				var request = {
					description: 'Demo Postcard job',
					to: {
			 			name: 'Joe Smith',
			 			address_line1: '123 Main Street',
			 			address_city: 'Mountain View',
			 			address_state: 'CA',
			 			address_zip: '94041'
			 		},
			 		front: tools.snail.postcard.prep(data.front.secure_url),
			 		back: tools.snail.postcard.prep(data.back.secure_url),
				}
				$http.post(config.parse.root+'/functions/snailPostcard', request).success(function(data){
					$scope.snail = data.result;
				})
			}
		}
		// thread: function(id){
		// 	var request = gapi.client.gmail.users.threads.get({
		// 		'userId': 	'me',
		// 		'id': 		id
		// 	});
		
		// 	request.execute(function(resp) {
		// 		it.r = resp
		// 		$scope.thread = [];
		// 		resp.messages.forEach(function(message){
		// 			var msg = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/') ); 
		// 			$scope.thread.push(msg)
		// 		})
		// 		$scope.$apply();
		// 	});
		// },
		// gmail: function(){
		// 	function listThreads() {
		// 		var request = gapi.client.gmail.users.threads.list({
		// 			'userId': 'me'
		// 		});
			
		// 		request.execute(function(data) {
		// 			$scope.threads = data.result.threads;
		// 			$scope.$apply();
		// 		});
		// 	}
		// 	Auth.tools.google.scopes('https://mail.google.com/').then(function(){
		// 		gapi.client.load('gmail', 'v1', listThreads);
		// 	})
		// }
	}
	tools.init();
	
	it.CommunicationCtrl = $scope;
});