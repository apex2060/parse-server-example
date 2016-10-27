app.lazy.controller('Test2Ctrl', function($scope, $http, Dados) {
	var Documents = Dados.connection('Documents');
	it.d = $scope.d = Documents;
	it.Dados = Dados

	var tools = $scope.tools = {

	}
	it.Test2Ctrl = $scope;
});