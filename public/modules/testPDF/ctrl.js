app.lazy.controller('TestPDF', function($scope, $http, $q, Parse, config) {
	var DB = null
	it.http = $http
	var tools = $scope.tools = {
		init: function(){
			$scope.pdfId = '67978744'
			Parse.prototype.schema().then(function(schema){
				$scope.schema = schema
			})
		},
		load: function(id){
			$http.post('https://the.easybusiness.center/PDFschema', {document_id:id}).success(function(data){
				$scope.pdfFields = tools.analyze(data);
				$scope.formFields = tools.convert($scope.pdfFields)
			})
		},
		analyze: function(pdfFields){
			var arrays = {}
			pdfFields = pdfFields.map(function(pdfField){
				if(pdfField.name.indexOf('-') != -1)
					pdfField.arrayOf = pdfField.name.split('-')[0]
				return pdfField;
			})
			pdfFields = pdfFields.filter(function(pdfField){
				if(arrays[pdfField.arrayOf]){
					++arrays[pdfField.arrayOf].arrayCt
					return false;
				}else if(pdfField.arrayOf){
					pdfField.arrayCt = 1;
					arrays[pdfField.arrayOf] = pdfField;
					return true;
				}else{
					return true;
				}
			})
			return pdfFields;
		},
		convert: function(pdfFields){
			var typeMap = {
				text: 'text',
				checkmark: 'checkbox'
			}
			var arrays = {"array":true,"dataType":"Object","enabled":true,"fields":[],"name":"pdfArrayItems","p":"","removeable":true,"title":"Multiple Items","type":"group"}
			var formFields = []
			pdfFields.forEach(function(pdfField){
				if(pdfField.arrayOf)
					arrays.fields.push({
						name:	pdfField.arrayOf,
						title:	pdfField.label,
						type:	typeMap[pdfField.type],
						placeholder: pdfField.arrayCt+' items'
					})
				else
					formFields.push({
						name:	pdfField.name,
						title:	pdfField.label,
						type:	typeMap[pdfField.type]
					})
			})
			if(arrays.fields.length)
				formFields.push(arrays)
			return formFields;
		},
		loadDb: function(db){
			DB = new Parse(db)
			DB.list().then(function(data){
				if(data){
					$scope.data = data;
					$scope.keys = Object.keys(data[0]);
				}
			})
		},
		breakOut: function(entry){
			entry = angular.copy(entry);
			if(entry.pdfArrayItems)
				entry.pdfArrayItems.forEach(function(arrItm, i){
					var keys = Object.keys(arrItm)
					keys.forEach(function(key){
						entry[key+'-'+i] = arrItm[key]
					})
				})
				delete entry.pdfArrayItems;
			return entry;
		},
		fill: function(id, entry){
			var formated = tools.breakOut(entry)
			$http.post('https://the.easybusiness.center/PDFfill', {document_id:id,data:formated}).success(function(data){
				entry._pdf_id = data.document_id
			})
		},
		ocr: {
			process: function(docUrl){
				tools.ocr.getText(docUrl).then(function(data){
					tools.ocr.analyze(data)
				})
			},
			getText: function(docUrl){
				var deferred = $q.defer();
				var request = {
					apikey: config.ocr,
					url: docUrl,
					language: "en"
				}
				
				// $http.post('https://apifree2.ocr.space/parse/image', request).success(function(data){
				// 	$scope.ocr = data
				// })
				$scope.data = {"ParsedResults":[{"TextOverlay":{"Lines":[{"Words":[{"WordText":"CON","Left":91,"Top":94,"Height":10,"Width":27}],"MaxHeight":10,"MinTop":94},{"Words":[{"WordText":"THUNDER","Left":52,"Top":155,"Height":11,"Width":86},{"WordText":"RUN","Left":142,"Top":156,"Height":10,"Width":36},{"WordText":"CONCRETE","Left":183,"Top":155,"Height":11,"Width":92},{"WordText":"AND","Left":278,"Top":156,"Height":10,"Width":37},{"WordText":"QUARRY","Left":320,"Top":156,"Height":13,"Width":68}],"MaxHeight":13,"MinTop":155},{"Words":[{"WordText":"THUN","Left":269,"Top":77,"Height":10,"Width":37}],"MaxHeight":10,"MinTop":77},{"Words":[{"WordText":"RUN","Left":335,"Top":77,"Height":10,"Width":27}],"MaxHeight":10,"MinTop":77},{"Words":[{"WordText":"INVOICE","Left":494,"Top":81,"Height":35,"Width":212}],"MaxHeight":35,"MinTop":81},{"Words":[{"WordText":"June","Left":424,"Top":207,"Height":10,"Width":30},{"WordText":"7,","Left":459,"Top":207,"Height":12,"Width":10},{"WordText":"2016","Left":474,"Top":207,"Height":10,"Width":31}],"MaxHeight":12,"MinTop":207},{"Words":[{"WordText":"3366","Left":431,"Top":278,"Height":10,"Width":31},{"WordText":"Queen","Left":466,"Top":278,"Height":11,"Width":41},{"WordText":"Hwy","Left":513,"Top":278,"Height":13,"Width":26},{"WordText":"Carlsbad,","Left":543,"Top":278,"Height":12,"Width":59},{"WordText":"NM","Left":608,"Top":278,"Height":10,"Width":20}],"MaxHeight":13,"MinTop":278},{"Words":[{"WordText":"P.o.","Left":52,"Top":189,"Height":7,"Width":20},{"WordText":"Box","Left":75,"Top":189,"Height":7,"Width":24},{"WordText":"620","Left":101,"Top":189,"Height":7,"Width":15}],"MaxHeight":7,"MinTop":189},{"Words":[{"WordText":"CARLSBAD","Left":52,"Top":207,"Height":7,"Width":57},{"WordText":"NM.","Left":111,"Top":207,"Height":7,"Width":21},{"WordText":"88220","Left":135,"Top":207,"Height":7,"Width":25}],"MaxHeight":7,"MinTop":207},{"Words":[{"WordText":"(575)","Left":52,"Top":225,"Height":10,"Width":22},{"WordText":"(575)","Left":122,"Top":225,"Height":10,"Width":21},{"WordText":"388-1546","Left":146,"Top":225,"Height":7,"Width":38}],"MaxHeight":10,"MinTop":225},{"Words":[{"WordText":"ckinnikin@dignpavecom","Left":52,"Top":239,"Height":13,"Width":147}],"MaxHeight":13,"MinTop":239},{"Words":[{"WordText":"King","Left":85,"Top":278,"Height":13,"Width":26},{"WordText":"soar","Left":116,"Top":278,"Height":10,"Width":33},{"WordText":"cargbad,","Left":153,"Top":278,"Height":12,"Width":58},{"WordText":"NM,","Left":217,"Top":278,"Height":12,"Width":24},{"WordText":"88220","Left":246,"Top":278,"Height":10,"Width":38}],"MaxHeight":13,"MinTop":278},{"Words":[{"WordText":"INVOICE","Left":345,"Top":189,"Height":7,"Width":48},{"WordText":"NO.","Left":395,"Top":189,"Height":7,"Width":20}],"MaxHeight":7,"MinTop":189},{"Words":[{"WordText":"3","Left":53,"Top":479,"Height":10,"Width":7}],"MaxHeight":10,"MinTop":479},{"Words":[{"WordText":"3000","Left":231,"Top":478,"Height":10,"Width":30},{"WordText":"PSI","Left":266,"Top":478,"Height":10,"Width":20},{"WordText":"G","Left":292,"Top":478,"Height":10,"Width":10},{"WordText":"MIX","Left":307,"Top":478,"Height":10,"Width":21}],"MaxHeight":10,"MinTop":478},{"Words":[{"WordText":"De","Left":231,"Top":499,"Height":10,"Width":17},{"WordText":"ivery","Left":252,"Top":499,"Height":13,"Width":28},{"WordText":"Fee","Left":285,"Top":499,"Height":10,"Width":23}],"MaxHeight":13,"MinTop":499},{"Words":[{"WordText":"6/7/16","Left":423,"Top":416,"Height":10,"Width":39}],"MaxHeight":10,"MinTop":416},{"Words":[{"WordText":"165.00","Left":424,"Top":478,"Height":10,"Width":41}],"MaxHeight":10,"MinTop":478},{"Words":[{"WordText":"150.00","Left":424,"Top":499,"Height":10,"Width":41}],"MaxHeight":10,"MinTop":499},{"Words":[{"WordText":"PAYMENT","Left":538,"Top":386,"Height":7,"Width":54}],"MaxHeight":7,"MinTop":386},{"Words":[{"WordText":"MO.","Left":535,"Top":420,"Height":7,"Width":19},{"WordText":"LATE","Left":557,"Top":419,"Height":8,"Width":27},{"WordText":"FEE","Left":586,"Top":420,"Height":7,"Width":21}],"MaxHeight":8,"MinTop":419},{"Words":[{"WordText":"7/7/2016","Left":626,"Top":416,"Height":10,"Width":54}],"MaxHeight":10,"MinTop":416},{"Words":[{"WordText":"LINE","Left":633,"Top":458,"Height":7,"Width":28},{"WordText":"TOTAL","Left":663,"Top":458,"Height":7,"Width":37}],"MaxHeight":7,"MinTop":458},{"Words":[{"WordText":"495.00","Left":627,"Top":479,"Height":10,"Width":42}],"MaxHeight":10,"MinTop":479},{"Words":[{"WordText":"150.00","Left":628,"Top":500,"Height":10,"Width":41}],"MaxHeight":10,"MinTop":500},{"Words":[{"WordText":"645.00","Left":625,"Top":857,"Height":10,"Width":42}],"MaxHeight":10,"MinTop":857},{"Words":[{"WordText":"37","Left":626,"Top":878,"Height":10,"Width":14},{"WordText":"89","Left":645,"Top":878,"Height":10,"Width":15}],"MaxHeight":10,"MinTop":878},{"Words":[{"WordText":"SALES","Left":565,"Top":882,"Height":7,"Width":30},{"WordText":"TAX","Left":598,"Top":881,"Height":8,"Width":22}],"MaxHeight":8,"MinTop":881},{"Words":[{"WordText":"68289","Left":627,"Top":899,"Height":10,"Width":42}],"MaxHeight":10,"MinTop":899},{"Words":[{"WordText":"all","Left":134,"Top":955,"Height":8,"Width":11},{"WordText":"to","Left":228,"Top":957,"Height":6,"Width":10},{"WordText":"JAMES","Left":240,"Top":955,"Height":11,"Width":39},{"WordText":"HAMILTON","Left":282,"Top":955,"Height":8,"Width":70},{"WordText":"CONSTRUCTION","Left":355,"Top":955,"Height":8,"Width":100},{"WordText":"P.o.","Left":458,"Top":955,"Height":8,"Width":22},{"WordText":"BOX","Left":484,"Top":955,"Height":8,"Width":26},{"WordText":"620","Left":513,"Top":955,"Height":8,"Width":16},{"WordText":"CARLSBAD,","Left":533,"Top":955,"Height":10,"Width":66},{"WordText":"NM.","Left":602,"Top":955,"Height":8,"Width":24},{"WordText":"88220","Left":630,"Top":955,"Height":8,"Width":27}],"MaxHeight":11,"MinTop":955},{"Words":[{"WordText":"THANK","Left":277,"Top":967,"Height":8,"Width":45},{"WordText":"YOU","Left":324,"Top":967,"Height":8,"Width":27},{"WordText":"FOR","Left":354,"Top":967,"Height":8,"Width":26},{"WordText":"YOUR","Left":382,"Top":967,"Height":8,"Width":35},{"WordText":"BUSINESS!","Left":420,"Top":967,"Height":8,"Width":62}],"MaxHeight":8,"MinTop":967}],"HasOverlay":true,"Message":""},"FileParseExitCode":1,"ParsedText":"CON \r\nTHUNDER RUN CONCRETE AND QUARRY \r\nTHUN \r\nRUN \r\nINVOICE \r\nJune 7, 2016 \r\n3366 Queen Hwy Carlsbad, NM \r\nP.o. Box 620 \r\nCARLSBAD NM. 88220 \r\n(575) (575) 388-1546 \r\nckinnikin@dignpavecom \r\nKing soar cargbad, NM, 88220 \r\nINVOICE NO. \r\n3 \r\n3000 PSI G MIX \r\nDe ivery Fee \r\n6/7/16 \r\n165.00 \r\n150.00 \r\nPAYMENT \r\nMO. LATE FEE \r\n7/7/2016 \r\nLINE TOTAL \r\n495.00 \r\n150.00 \r\n645.00 \r\n37 89 \r\nSALES TAX \r\n68289 \r\nall to JAMES HAMILTON CONSTRUCTION P.o. BOX 620 CARLSBAD, NM. 88220 \r\nTHANK YOU FOR YOUR BUSINESS! \r\n","ErrorMessage":"","ErrorDetails":""}],"OCRExitCode":1,"IsErroredOnProcessing":false,"ErrorMessage":null,"ErrorDetails":null,"ProcessingTimeInMilliseconds":"4218"}
				deferred.resolve($scope.data)
				return deferred.promise;
			},
			analyze: function(data){
				//Read all text to make estimated guess of vendor and mapping type.
				//If vendor and mapping data was found
					//Load mapping data
					//Loop through lines and find previously mapped data (use a delta to make educated guess)
					//[top < previousTop+5 && top > previousTop-5] && [left < previousLeft+5 && left > previousLeft-5]
					//map content to variable.
				//These imported documents (invoices) should be relative to data that already exists. (PO)
				//We should pull in all open PO for vendor X
				//Then match mapped data (stripped to lower & condensed) to existing PO data.
				//If there are descripencies, enter the OCR version and mark field red.
				//If we can not find a good matching PO, then do not load any.
				//Always allow the user to manually select.
				//Allow user to enter data without a PO?
			}
		}
	}
	tools.init();
	it.TestPDF = $scope;
});