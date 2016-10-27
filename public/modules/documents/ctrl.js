app.lazy.controller('DocCtrl', function($scope, $routeParams, $location, $sce, $q, $http, config, Auth, Parse, Google){
	var Docs = new Parse('Docs');
	var Folders = new Parse('DocFolders');
	var Signatures = new Parse('DocSignatures');
	var FillMagic = new Parse('DocFillMagic');
	$scope.history = [];
	$scope.pending = [];
	$scope.modified = [];

	var tools = $scope.tools = {
		init: function(){
			$scope.rootFolder = {
				isRoot: 	true,
				title:		'Documents',
				folders:	[],
				docs:		[]
			}
			Auth.init().then(function(){
				tools.folder.focus($scope.rootFolder);
			})
		},
		view: function(view){
			if(view)
				$scope.view = view;
			if(!$scope.view)
				$scope.view = 'browse';
			return 'modules/documents/view/'+$scope.view+'.html'
		},
		upload: {
			init: function(folder){
				cloudinary.openUploadWidget({
					cloud_name: config.params.cloudinary.cloud_name,
					upload_preset: 'file_upload',
					theme: 'white',
					multiple: true,
				},
				function(error, result) {
					var docs = result.map(function(r){
						var doc = {
							title: r.original_filename,
							cloudinary: r
						}
						if(r.secure_url){
							doc.img_url = r.secure_url.replace('.pdf', '.jpg')
							doc.pdf_url = r.secure_url.replace('.jpg', '.pdf')
							doc.pdf_url = doc.pdf_url.replace('.png', '.pdf')
							doc.pdf_url = doc.pdf_url.replace('.tiff', '.pdf')
						}
						if(!folder.isRoot){
							doc.folder = Folders.pointer(folder);
							doc.ACL = folder.ACL;
						}
						return doc;
					});
					tools.upload.save(docs, folder);
				});
			},
			save: function(docs, folder){
				docs.forEach(function(doc,i){
					Docs.save(doc).then(function(r){
						if(folder){
							folder.docs = folder.docs || [];
							folder.docs.push(angular.extend(r,doc))
						}else{
							$scope.pending.push(angular.extend(r,doc))
							if(i==0)
								tools.doc.focus($scope.pending[0]);
						}
					})
				})
			}
		},
		folder: {
			add: function(parent){
				var folder = {
					title: prompt('New Name')
				}
				if(parent && !parent.isRoot){
					folder.folder = Folders.pointer(parent)
					folder.ACL = angular.copy(parent.ACL);
				}
				Docs.ACL.modal(folder, 'Who has permission to view this folder?').then(function(r){
					// folder.ACL = r.ACL;
					Folders.save(folder).then(function(result){
						parent.folders.push(angular.extend(folder, result))
					})
				})
			},
			acl: function(folder){
				if(!folder.isRoot)
					Folders.ACL.modal(folder, 'Who has permission to view this folder?').then(function(r){
						//[]Set all file acl to r.ACL
						Folders.save(folder).then(function(result){
							toastr.success('Folder Updated.')
						})
					})
			},
			focus: function(folder){
				tools.view('browse');
				var i = $scope.history.indexOf(folder);
				if(i != -1){
					$scope.history = $scope.history.slice(0, i+1)
				}else{
					$scope.history.push(folder);
				}
				$scope.focus = folder;
				if(folder.isRoot){
					$q.all([
						Folders.query('?where={"folder":{"$exists":false}}'),
						Docs.query('?where={"folder":{"$exists":false}}')
					]).then(function(results){
						folder.folders = results[0];
						folder.docs = results[1];
					})
				}else{
					tools.folder.data(folder);
					$scope.focusAcl = Object.keys(folder.ACL).map(function(key){
						var b = folder.ACL[key];
						var entity = key
						if(key == $scope.user.pAuth.user.objectId)
							entity = 'You';
						else if(key == '*')
							entity = 'Everyone'
						return {
							entity: entity,
							read: b.read,
							write: b.write
						}
					}).filter(function(a){
						return a.entity.indexOf('Admin') == -1
					})
					$q.all([
						Folders.query('?where={"folder":{"__type":"Pointer","className":"DocFolders","objectId":"'+folder.objectId+'"}}'),
						Docs.query('?where={"folder":{"__type":"Pointer","className":"DocFolders","objectId":"'+folder.objectId+'"}}')
					]).then(function(results){
						folder.folders = results[0];
						folder.docs = results[1];
					})
				}
			},
			data: function(folder){
				if(folder.data){
					if(folder.data.table){
						$scope.Data = new Parse(folder.data.table);
						$scope.Data.query(folder.data.query).then(function(list){
							$scope.data = list;
						})
					}
				}
			},
			remove: function(folder){
				if(confirm('Are you sure you want to delete this folder?'))
					Folders.delete(folder).then(function(r){
						toastr.success('Folder Deleted.')
					})
			}
		},
		ai: {
			itemRelation: function(item){
				if(item && $scope.relations){
					return $scope.relations.find(function(r){
						if(r && r.item)
							return r.item.objectId == item.objectId;
					})
				}
			},
			docRelation: function(doc){
				if(doc && $scope.relations){
					return $scope.relations.find(function(r){
						if(r && r.doc)
							return r.doc.objectId == doc.objectId;
					})
				}
			},
			match: function(data, docs){
				function textMatch(item, key, invoice){
					var needle = item[key].replace(/[^a-zA-Z]/g, "").toLocaleLowerCase()
					var haystack = invoice.ocr.replace(/[^a-zA-Z]/g, "").toLocaleLowerCase()
					if(haystack.indexOf(needle) != -1)
						return 1;
					else return 0;
				}
				function numberMatch(item, key, invoice){
					var needle = item[key].replace(/[^0-9]/g, "")
					var haystack = invoice.ocr.replace(/[^0-9]/g, "")
					if(haystack.indexOf(needle) != -1)
						return 1;
					else return 0;
				}
				function bestRank(item, docs, minimum){
					var best = null;
					var bestRank = minimum-1;
					docs.forEach(function(doc){
						var rank = 0;
						if(doc.ocr){
							Object.keys(item).forEach(function(key){
								rank += textMatch(item, key, doc)
								rank += numberMatch(item, key, doc)
							})
							if(bestRank < rank){
								bestRank = rank;
								best = doc;
							}
						}
					})
					return {
						item: item,
						doc: best,
						rank: bestRank
					}
				}
				
				tools.ai.index(docs).then(function(docs){
					var relations = [];
					data.forEach(function(item){
						var best = bestRank(item, docs, 2);
						if(best.doc)
							relations.push(best)
					})
					$scope.relations = relations;
				})
			},
			index: function(docs){
				var promises = [];
				docs.forEach(function(doc){
					var deferred = $q.defer();
					promises.push(deferred.promise);
					if(doc.ocr){
						deferred.resolve(doc);
					}else{
						tools.ai.ocr(doc).success(function(r){
							if(r && r.ParsedResults){
								doc.ocr = r.ParsedResults.reduce(function(a,b){
									return a+' '+b.ParsedText;
								}, '');
								Docs.save(doc).then(function(r){
									deferred.resolve(doc);
								})
							}
						})
					}
				})
				return $q.all(promises)
			},
			ocr: function(doc){
				// var deferred = $q.defer();
				var url = doc.pdf_url;
				var url = doc.img_url.split('/upload/')
					url = url.join('/upload/e_blackwhite:80/')
				var apiKey = '71ff105c9788957';
				var formData = new FormData();
				formData.append("url", url);
				formData.append("language", "eng");
				formData.append("apikey", apiKey);
				formData.append("isOverlayRequired", false);
				
				//Send OCR Parsing request asynchronously
				return $http.post('https://api.ocr.space/parse/image/', formData, {
		            transformRequest: angular.identity,
		            headers: {'Content-Type': undefined}
				})
			},
		},
		doc: {
			focus: function(doc){
				$scope.doc = doc;
			},
			acl: function(doc){
				Docs.ACL.modal(doc, 'Update sharing permissions for this document.').then(function(r){
					Docs.save(doc).then(function(r){
						toastr.success('Document Permissions Updated.')
					})
				})
			},
			setFolder: function(folder){
				var i = $scope.pending.indexOf($scope.doc);
				var doc = $scope.doc;
				doc.folder = Folders.pointer(folder);
				doc.ACL = folder.ACL;
				Docs.save(doc).then(function(r){
					doc = angular.extend(doc, r)
					$scope.docs.push(doc);
					$scope.pending.splice(i,1);
					$scope.modified.push(doc);
					delete $scope.doc;
					
					if(i >= $scope.pending.length)
						i--
					if(i>=0)
						tools.doc.focus($scope.pending[i])
				})
			}
		},
		sign: {
			init: function(doc){
				$scope.doc = doc;
				function prep(doc){
					$scope.sig = {
						document_id:	doc.pdffiller.id,
						method: 		'sendtoeach',
						security_pin:	'standard',
						recipients: 	[]
					}
					$('#signatureModal').modal('show')
				}
				Signatures.query('?where={"doc":{"__type":"Pointer","className":"Docs","objectId":"'+doc.objectId+'"}}').then(function(sigs){
					$scope.signatures = sigs
				})
				if(doc.pdffiller)
					prep(doc);
				else
					tools.sign.upload(doc).then(function(doc){
						prep(doc);
					})
			},
			new: function(){
				$scope.sig.recipients.push({})
			},
			upload: function(doc){
				var deferred = $q.defer();
				$http.post(config.secureUrl+'/pdf', {
					path: 'document',
					params: {file: doc.pdf_url},
					method: 'POST',
					response: 'full'
				}).success(function(r){
					if(r.data.errors){
						toastr.error('There was an error preparing this document.')
					}else{
						doc.pdffiller = r.data;
						Docs.save(doc).then(function(r){
							deferred.resolve(doc);
						}, function(e){
							toastr.error('There was an error preparing this document.')
						})
					}
				})
				return deferred.promise;
			},
			send: function(doc){
				if(doc && $scope.sig){
					if($scope.sig.sign_in_order == undefined)
						$scope.sig.sign_in_order = false;
					$scope.sig.recipients = $scope.sig.recipients.map(function(r, i){
						r.message_subject = $scope.sig.subject;
						r.message_text = $scope.sig.message;
						r.order = i+1;
						if(r.canEdit)
							r.access = 'full'
						else
							r.access = 'signature'
						return r
					})
					$http.post(config.secureUrl+'/pdf', {
						path: 'signature_request',
						params: $scope.sig,
						method: 'POST',
						response: 'full'
					}).success(function(r){
						if(r.errors){
							r.errors.forEach(function(e){
								toastr.error(e.message)
							})
						}else{
							r.data.items.forEach(function(sigReq){
								sigReq.doc = Docs.pointer(doc);
								Signatures.save(sigReq).then(function(r){
									$scope.signatures.push(angular.extend(r, sigReq))
									$('#signatureModal').modal('hide');
									toastr.success('Request Sent!')
								})
							})
						}
					})
				}else{
					toastr.error('You must enter the signer name and email to make a request.')
				}
			}
		},
		fill: {
			list: function(){
				FillMagic.query('?include=doc').then(function(list){
					$scope.fillMagic = list;
				})
			},
			remove: function(req){
				FillMagic.delete(req).then(function(){
					$scope.fillMagic.splice($scope.fillMagic.indexOf(req), 1)
					toastr.success('Request Deleted.')
				})
			},
			request: function(doc){
				function save(doc){
					var magic = {
						requestedBy: $scope.user.pAuth.user.username,
						doc: Docs.pointer(doc)
					}
					FillMagic.save(magic).then(function(r){
						toastr.success('Your request has been sent!')
					})
				}
				if(doc.pdffiller)
					save(doc)
				else
					tools.sign.upload(doc).then(function(doc){
						save(doc);
					})
			}
		},
		fax: {
			init: function(doc){
				$scope.tempFax = {
					attachment: doc
				}
				var FaxNumbers = new Parse('FaxNumbers')
				FaxNumbers.list().then(function(list){
					$scope.faxNumbers = list
				})
				$('#faxSendModal').modal('show')
			},
			send: function(tempFax){
				var Faxes = new Parse('Faxes')
				tempFax.attachment = tempFax.attachment.cloudinary;
				Faxes.save(tempFax).then(function(r){
					console.log(r);
					$('#faxSendModal').modal('hide')
					toastr.info('Sending Fax.');
					delete $scope.tempFax;
				})
			}
		},
		admin: {
			data: {
				init: function(){
					$scope.temp = {
						data: angular.copy($scope.focus.data)
					}
					$('#dataModal').modal('show');
				},
				save: function(data){
					$scope.focus.data = data;
					if(!$scope.focus.isRoot){
						var folder = angular.copy($scope.focus);
						delete folder.folders;
						delete folder.docs;
						Folders.save($scope.focus).then(function(r){
							toastr.success('Folder Saved.');
							$('#dataModal').modal('hide');
						})
					}
					tools.folder.data($scope.focus);
				}
			},
			fax: {
				init: function(folder){
					$('#faxModal').modal('show');
					var FaxNumbers = $scope.FaxNumbers = new Parse('FaxNumbers');
					FaxNumbers.list().then(function(list){
						$scope.faxNumbers = list;
					})
				},
				toggleLink: function(fax, folder){
					if(fax.folder && fax.folder.objectId == folder.objectId){
						fax.folder = null;
						var message = 'Fax Number Unlinked.'
					}else{
						fax.folder = Folders.pointer(folder);
						var message = 'Faxes sent to: '+fax.number+', will be added to: '+folder.title
					}
					$scope.FaxNumbers.save(fax).then(function(r){
						toastr.success(message)
					})
				}
			}
		}
	}
	
	tools.init();
	it.DocCtrl = $scope;
});