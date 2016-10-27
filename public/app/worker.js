var CACHE_NAME = 'jhcc-cache-v1';
var urlsToCache = [
  '/',
  '/app/app.js',
  '/app/config.js'
];

self.addEventListener('install', function(event) {
	// Perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME)
		.then(function(cache) {
			console.log('Opened cache');
			return cache.addAll(urlsToCache);
		})
	);
});


// self.addEventListener('fetch', function(event) {
//   event.respondWith(
// 	caches.match(event.request)
// 	  .then(function(response) {
// 		// Cache hit - return response
// 		if (response) {
// 		  return response;
// 		}

// 		// IMPORTANT: Clone the request. A request is a stream and
// 		// can only be consumed once. Since we are consuming this
// 		// once by cache and once by the browser for fetch, we need
// 		// to clone the response
// 		var fetchRequest = event.request.clone();

// 		return fetch(fetchRequest).then(
// 		  function(response) {
// 			// Check if we received a valid response
// 			if(!response || response.status !== 200 || response.type !== 'basic') {
// 			  return response;
// 			}

// 			// IMPORTANT: Clone the response. A response is a stream
// 			// and because we want the browser to consume the response
// 			// as well as the cache consuming the response, we need
// 			// to clone it so we have 2 stream.
// 			var responseToCache = response.clone();

// 			caches.open(CACHE_NAME)
// 			  .then(function(cache) {
// 				cache.put(event.request, responseToCache);
// 			  });

// 			return response;
// 		  }
// 		);
// 	  })
// 	);
// });

self.addEventListener('push', function(event) {
	console.log('Received a push message', event);

	var title = 'Yay a message.';
	var body = 'We have received a push message.';
	var icon = '/images/icon-192x192.png';
	var tag = 'simple-push-demo-notification-tag';

	event.waitUntil(
		self.registration.showNotification(title, {
			body: body,
			icon: icon,
			tag: tag
		})
	);
});