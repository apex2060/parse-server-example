app.lazy.controller('ComFaxCtrl', function($scope, $timeout, $http, $sce, config, FileService, Documents, Data, Auth){
	var acceptedFiles = ['doc', 'docx', 'pdf', 'tif', 'jpg', 'png', 'odt', 'txt', 'html'];
	
	var FaxNums		= Data({
		className: 	'PhoneNumbers',
		query: 		'?order=-createdAt&where={"type":"fax"}',
		fireRef:	'FaxNumbers'
	});
	var Faxes 		= Data({
		className: 	'Faxes',
		query: 		'?order=-createdAt&where={"archived":false}',
		fireRef:	'Faxes'
	});
	var FaxAlerts 	= Data({
		className: 	'Alerts',
		query: 		'?order=-createdAt&where={"class":"Faxes"}',
		fireRef:	'FaxAlerts'
	});
	$scope.$on(FaxNums.listener, function(e, faxNumbers) {
		$scope.faxNumbers = faxNumbers
	});
	$scope.$on(Faxes.listener, function(e, faxes) {
		var faxesSent 		= $scope.faxesSent = [];
		var faxesReceived 	= $scope.faxesReceived = [];
		for(var i=0; i<faxes.length; i++)
			if(faxes[i].direction == 'sent')
				faxesSent.push(faxes[i])
			else
				faxesReceived.push(faxes[i])
	});

	var tools = $scope.tools = {
		init: function(){
			tools.number.init();
			tools.fax.init();
			Auth.tools.init().then(function(user){
				FaxNums.tools.list()
				Faxes.tools.list()
				FaxAlerts.tools.list()
			});
		},
		number: {
			init: function(){
				tools.number.list();
				tools.number.areaCodes();
				$scope.number = {status: 'Choose an area code to provision a new fax number.'}
			},
			areaCodes: function(){
				$http.post('https://api.parse.com/1/functions/faxAreaCodes', {}).success(function(data){
					var ac = data.result.data.data;
					var acs = [];
					for(var key in ac)
						acs.push(key);
					$scope.areaCodes = acs;
				}).error(function(e){
					$scope.file.status = 'Error sending fax.'
				})
			},
			sync: function(){
				$http.post('https://api.parse.com/1/functions/syncFaxNumbers', {}).success(function(data){
					tools.number.list();
				}).error(function(e){
					$scope.file.status = 'Error sending fax.'
				})
			},
			list: function(){
				FaxNums.tools.broadcast();
			},
			add: function(areaCode){
				FaxNums.tools.save({areaCode: areaCode, type: 'fax'})
			},
			focus: function(faxNum){
				$scope.faxNum = faxNum;
				tools.alerts.listFor(faxNum.number);
			},
			save: function(faxNum){
				var fax = angular.copy(faxNum);
				FaxNums.tools.save(fax)
			},
			remove: function(faxNum){
				if(confirm('You will not be able to recover this number once it is gone.  Are you sure you want to release this number?')){
					FaxNums.tools.delete(faxNum).then(function(data){
						$scope.faxNum = null;
					})
				}
			}
		},
		fax: {
			init: function(){
				$scope.sendFaxResult = {status: 'Choose a file to fax.'};
			},
			focus: function(fax, ptr){
				$scope.fax = fax;
			},
			upload: function(file){
				Documents.upload(file).then(function(data){
					var preview = tools.file.render(file.url);
					$scope.preview = {};
					$scope.preview[preview.type] = preview;
					$scope.file = data;
				})
			},
			send: function(from, to, doc){
				to = to.replace(/\D/g,'');

				if(to.length == 10)
					to = 1+''+to;
				else if(to.length == 7)
					to = 1+''+from.number.substr(0,3)+to;
					
					
				if(to.length != 11){
					alert('You must enter a 10 digit phone number.')
				}else if(!from){
					alert('You must select the number from which you will be sending this fax.')
				}else{
					$scope.sendFaxResult = {status: 'Processing...'};
					var fax = {
						document: 	Documents.root.tools.ref(doc),
						file: 			doc.file,
						localNumber: 	from.number,
						remoteNumber: 	to
					}
					
					Faxes.tools.save(fax).then(function(result){
						$scope.sendFaxResult = result;
					})
				}
			},
			archive: function(fax){
				if(confirm('Archiving will remove this fax from the list.  Are you sure you want to archive this fax?')){
					fax.archived = true;
					Faxes.tools.save(fax)
				}
			},
			reload: function(){
				Faxes.tools.broadcast();
			}
		},
		alerts: {
			listFor: function(number){
				$scope.faxAlert = {};
				FaxAlerts.tools.list().then(function(alerts){
					$scope.faxAlerts = [];
					for(var i=0; i<alerts.length; i++)
						for(var c=0; c<alerts[i].rules.criteria.length; c++)
							if(alerts[i].rules.criteria[c].column == 'localNumber' && alerts[i].rules.criteria[c].value == ''+number)
								$scope.faxAlerts.push(alerts[i])
				})
			},
			focus: function(a){
				$scope.faxAlert = a;
			},
			add: function(localNumber, remoteNumber){
				var notification = {
					"criteria":[
						{"column":"direction","comparison":"equalTo","value":"received"}
					],"notifications":[
						{"message":"You received a fax from: <remoteNumber>.  <link>","to":"cellNumber","type":"txt"}
					]
				}
				if(localNumber)
					notification.criteria.push({"column":"localNumber","comparison":"equalTo","value":localNumber})
				if(remoteNumber)
					notification.criteria.push({"column":"remoteNumber","comparison":"equalTo","value":remoteNumber})
				$scope.faxAlerts.push({rules:notification, class:'Faxes'});
			},
			remove: function(faxAlert, faxNum){
				FaxAlerts.tools.delete(faxAlert).then(function(){
					var i = $scope.faxAlerts.indexOf(faxAlert)
					$scope.faxAlerts.splice(i,1)
				})
			},
			save: function(faxAlert){
				FaxAlerts.tools.save(faxAlert).then(function(){
					alert('Notification saved.')
				})
			}
		},
		file: {
			render: function(url){
				if(url){
					var pcs = url.split('.')
					var suffix = pcs[pcs.length-1].toLowerCase();
					if (suffix == 'pdf')
						return {type:'pdf', url:$sce.trustAsResourceUrl('https://drive.google.com/viewerng/viewer?url='+url+'&embedded=true')}
					else if (['tif', 'jpg', 'png'].indexOf(suffix) != -1)
						return {type:'img', url:$sce.trustAsResourceUrl(url)}
				}
			}
		}
	}
	
	tools.init();
	it.ComFaxCtrl = $scope;
});