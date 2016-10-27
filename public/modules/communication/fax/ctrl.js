app.lazy.controller('ComFaxCtrl', function($scope, $http, Parse, Auth, config){
	var acceptedFiles = ['doc', 'docx', 'pdf', 'tif', 'jpg', 'png', 'odt', 'txt', 'html'];
	var FaxNumbers = new Parse('FaxNumbers');
	var tools = $scope.tools = {
		init: function(){
			FaxNumbers.query('?include=folder').then(function(numbers){
				$scope.numbers = numbers;
			})
			tools.provision.init();
		},
		number: {
			focus: function(n){
				$scope.number = n;
			},
			acl: function(n){
				FaxNumbers.ACL.modal(n, 'Set who can send and receive faxes with this number.')
			},
			save: function(n){
				n = angular.copy(n);
				delete n.folder;
				FaxNumbers.save(n).then(function(result){
					toastr.success('Fax Number Saved.')
				}, function(e){
					toastr.error(e)
				})
			},
			remove: function(n){
				alert('You will not be able to get this number back if you delete it.')
				if(prompt('Enter the phone number ('+n.number+') to confirm deletion.') == n.number)
					FaxNumbers.delete(n).then(function(result){
						toastr.success('Fax Number Deprovisioned.')
					}, function(e){
						toastr.error(e)
					})
			},
			removeFolder: function(n){
				if(confirm('Are you sure you want to dis-associate this folder?')){
					n.folder = null;
					tools.number.save(n);
				}
			}
		},
		provision: {
			init: function(){
				$http.post(config.parse.root+'/functions/faxAreaCodes').success(function(data){
					var keys = Object.keys(data.result.data)
					$scope.areaCodes = keys.map(function(key){
						var d = data.result.data[key]
						return {
							title: key+' - '+d.city+' '+d.state,
							city: 	d.city,
							state: 	d.state,
							code: 	key
						}
					})
				}).error(function(e){
					toastr.error(e)
				})
			},
			order: function(areaCode){
				if(confirm('Provisioning a number costs money, please confirm this purchase.')){
					$http.post(config.parse.root+'/functions/faxProvision', {area_code:areaCode}).success(function(data){
						it.d = data;
						toastr.success('Number Provisioned.')
						tools.init();
					}).error(function(e){
						toastr.error(e.error)
					})
				}
			}
		}
		// document: {
		// 	acl: function(n){
		// 		if(!n.document)
		// 			n.document = {};
		// 		FaxNumbers.ACL.modal(n.document, 'Who can view faxes to this number?')
		// 	},
		// },
	}
	
	tools.init();
	it.ComFaxCtrl = $scope;
});