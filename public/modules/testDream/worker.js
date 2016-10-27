
function discover(db, needle){
	var discoveries = [];
	function schema(){
		return $http.post('/api', {
			method: 'GET',
			path: 	'/'+db+'/_schema'
		})
	}
	function table(table){
		return $http.post('/api', {
			method: 'GET',
			path: 	'/'+db+'/_table/'+table
		})
	}
	
	schema().success(function(data){
		data.resource.forEach(function(s){
			table(s.name).success(function(t){
				var keys = Object.keys(t.resource[0]);
				t.resource.forEach(function(r){
					keys.forEach(function(key){
						if(r[key] == needle)
							discoveries.push({
								table: s.name,
								row: r,
								key: key
							})
					})
				})
			})
		})
	})
}


self.addEventListener('message', function(e) {
	self.postMessage(e.data);
}, false);