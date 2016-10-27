app.lazy.controller('ComDirCtrl', function($scope, $timeout, $http, $sce, config, FileService, Documents, Data, Auth) {
	var Outposts = Data({
		className: 'Outposts',
		query: '',
		fireRef: 'Outposts'
	});

	var tools = $scope.tools = {
		dir: {
			init: function() {
				var scopes = [
					'https://www.googleapis.com/auth/admin.directory.user.readonly',
					'https://www.googleapis.com/auth/admin.directory.orgunit.readonly'
				];
				Auth.tools.google.scopes(scopes).then(function(result){
					gapi.client.load('admin', 'directory_v1', function(){
						var directory = tools.load.directory();
						var groups = tools.load.groups();
						$q.all([directory, groups]).then(function(dir, grp){
							deferred.resolve(dir,grp)
						})
					});
				});
			}
		}
	}
	it.ComDirCtrl = $scope;
});