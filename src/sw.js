var CACHE = "v3";

this.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll([
        '/css/main.css',
        '/js/app.js',
      ]);
    })
  );
});

this.addEventListener('fetch', function(event) {
  event.respondWith(fromCache(event.request));
  event.waitUntil(update(event.request));
});

function fromCache(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    });
  });
}

function update(request) {
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}

this.addEventListener('activate', function(event) {
  var cacheWhitelist = [CACHE];

  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (cacheWhitelist.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    })
  );
});
