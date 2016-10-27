app.lazy.controller('PhoneCtrl', function($rootScope, $scope, $routeParams, $location, $http, Parse, config){
	$scope.view = 'list';
	var Numbers = new Parse('PhoneNumbers');
	var Endpoints = new Parse('PhoneEndpoints');
	var days = $scope.days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
	var countryCodes = $scope.countryCodes = [
		{title: 'United States', 	code: 'US'},
		{title: 'United Kingdom', 	code: 'GB'},
		{title: 'Germany', 			code: 'DE'},
		{title: 'Brazil', 			code: 'BR'},
		{title: 'Switzerland', 		code: 'CH'},
		{title: 'New Zealand', 		code: 'NZ'},
	]
	
	var tools = $scope.tools = {
		init: function(){
			tools.number.init();
			tools.endpoint.init();
		},
		view: function(view){
			if(view)
				$scope.view = view;
			return '/modules/communication/phone/view/'+$scope.view+'.html'
		},
		number: {
			init: function(){
				Numbers.list().then(function(list){
					$scope.numbers = list;
					if($routeParams.id){
						$scope.number = $scope.numbers.find(function(n){
							return n.objectId == $routeParams.id
						})
						$scope.view = 'number';
					}
				})
			},
			focus: function(number){
				$location.search('id', number.objectId);
				$scope.number = number
				$scope.view = 'number'
			},
			open: function(){
				$location.search('id', null);
				$scope.view = 'list'
			},
			new: function(){
				tools.number.modal();
			},
			modal: function(){
				$scope.numberSearch = {country_iso:'US'}
				$('#newNumberModal').modal('show')
			},
			search: function(params){
				$http.post(config.parse.root+'/functions/listPhoneNumbers', params).success(function(data){
					$scope.numberOptions = data.result.objects
				}).error(function(e){
					toastr.error(e)
				})
			},
			purchase: function(number){
				if(confirm('Please confirm your purchase of: '+number.number)){
					Numbers.save({
						type: 	'phone',
						number:	number.number,
						city: 	number.rate_center,
						state: 	number.region
					}).then(function(n){
						$scope.numbers.push(n)
						toastr.success(number.number, 'Number Registered!')
					})
				}
			},
			save: function(number){
				Numbers.save(number).then(function(r){
					toastr.success('Number Saved')
				})
			},
			delete: function(number){
				if(confirm('Are you sure you want to delete this number?')){
					$scope.status = {delete: 'Deleting...'}
					Numbers.delete(number).then(function(r){
						delete $scope.status;
						toastr.success('Number Removed')
						var i = $scope.numbers.indexOf(number);
						$scope.numbers.splice(i,1)
						//Go back to list
					}, function(e){
						toastr.error(e)
						delete $scope.status;
					})
				}
			},
			acl: function(){
				if(!$scope.number)
					$scope.number = {};
				Numbers.ACL.modal($scope.number, 'Set who has permission to see or modify this number.')
			}
		},
		endpoint: {
			init: function(){
				Endpoints.list().then(function(list){
					$scope.endpoints = list;
				})
			},
			focus: function(endp){
				$scope.oEndpoint = endp;
				var data = '<?xml version="1.0" encoding="utf-8"?><AccountConfig version="1"><Account><RegisterServer>phone.plivo.com</RegisterServer>'
					data +='<OutboundServer></OutboundServer><UserID>'+endp.username+'</UserID><AuthID>'+endp.username+'</AuthID><AuthPass>'+endp.password+'</AuthPass>'
					data +='<AccountName>'+endp.alias+'</AccountName><DisplayName>'+endp.alias+'</DisplayName>'
					data +='<Dialplan>{x+|*x+|*++}</Dialplan><RandomPort>0</RandomPort><SecOutboundServer></SecOutboundServer><Voicemail>*97</Voicemail></Account></AccountConfig>'
				var qrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data='+data
				endp.qrl = qrl
				tools.endpoint.modal(angular.copy(endp))
			},
			new: function(){
				$scope.oEndpoint = {};
				tools.endpoint.modal({})
			},
			modal: function(endp){
				$scope.endpoint = endp
				$('#newEndpointModal').modal('show')
			},
			save: function(endp){
				$scope.status = {save: 'Saving...'}
				Endpoints.save(endp).then(function(r){
					delete $scope.status;
					toastr.success('Endpoint Saved')
					if(endp.origin != 'cloud'){
						$scope.endpoints.push(r)
						tools.endpoint.focus(r)
					}else{
						var i = $scope.endpoints.indexOf($scope.oEndpoint);
						$scope.endpoints.splice(i, 1, r)
						tools.endpoint.focus(r)
					}
				}, function(e){
					toastr.error(e)
					delete $scope.status;
				})
			},
			delete: function(endp){
				if(confirm('Are you sure you want to delete this endpoint?')){
					$scope.status = {delete: 'Deleting...'}
					Endpoints.delete(endp).then(function(r){
						delete $scope.status;
						toastr.success('Endpoint Removed')
						var i = $scope.endpoints.indexOf(endp);
						$scope.endpoints.splice(i,1)
						$('#newEndpointModal').modal('hide')
					}, function(e){
						toastr.error(e)
						delete $scope.status;
					})
				}
			}
		},
		rule: {
			focus: function(rule){
				$scope.focusType = 'rule';
				$scope.focus = rule;
			},
			add: function(obj){
				if(!$scope.number.rules)
					$scope.number.rules = [];
				$scope.number.rules.push(obj)
			},
			time: {
				manage: function(rule, time){
					
				}
			}
		},
		flow: {
			focus: function(flow){
				$scope.focusType = 'flow';
				$scope.focus = flow;
			},
			add: function(obj){
				if(!$scope.number.flows)
					$scope.number.flows = [];
				$scope.number.flows.push(obj)
			},
			time: {
				manage: function(flow, time){
					
				}
			},
			forward: {
				addNumber: function(action){
					if(!action.numbers)
						action.numbers = [];
					if(String(action.number).length == 10)
						action.number = '1'+action.number
					if(String(action.number).length >= 11){
						action.numbers.push(action.number)
						delete action.number;
					}else{
						toastr.error('You must enter a number with an area code.')
					}
				}
			},
			menu: {
				addItem: function(action){
					if(!action.items)
						action.items = []
					var ct = action.items.length + 1;
					action.items.push({extention: ct})
				}
			}
		},
		action: {
			add: function(flow, obj){
				if(!flow.actions)
					flow.actions = [];
				flow.actions.push(obj)
			},
			time: {
				manage: function(flow, time){
					
				}
			},
			record: {
				modal: function(action){
					if(!action.record)
						action.record = {active: true, maxLength:60}
					$scope.action = action;
					$('#recordSettingsModal').modal('show');
				},
				toggle: function(action){
					action.record.active = !action.record.active
				},
				acl: function(){
					if(!$scope.action.record)
						$scope.action.record = {ACL: {}};
					Numbers.ACL.modal($scope.action.record, 'All recordings will be applied with the following rules.')
				}
			}
		},
		item: {
			focus: function(item){
				$scope.focus = item;
			},
			copyTo: function(list, item){
				list.push(angular.copy(item));
			},
			tFocus: function(item){
				$scope.tFocus = item;
			},
			add: function(parent, attr, item){
				if(!parent[attr])
					parent[attr] = []
				parent[attr].push(item)
			},
			remove: function(list, item){
				if(confirm('Are you sure you want to remove this item?'))
					list.splice(list.indexOf(item), 1)
			},
		},
	}
	tools.init();
	
	it.PhoneCtrl = $scope;
});