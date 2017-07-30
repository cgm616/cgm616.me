var CACHE = "v3";

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      console.log("[install] successfully running and cache opened to preload");
      return cache.addAll([
        '/js/app.js',
        '/css/main.css',
        '/css/highlight-default.css'
      ]);
    }).then(function() {
      console.log("[install] cache preloaded");
      self.skipWaiting();
    })
  );
});

function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    promises = promises.map(p => Promise.resolve(p));
    promises.forEach(p => p.then(resolve));
    promises.reduce((a, b) => a.catch(() => b))
      .catch(() => reject(Error("All failed")));
  });
};

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.open(CACHE).then(cache => {
      return promiseAny([
        cache.match(event.request).then(response => {
          if(response) {
            return Promise.resolve(response);
          } else {
            return Promise.reject('not in cache');
          }
        }),
        fetch(event.request.clone()).then(response => {
          if(response) {
            if(response.status < 400) {
              cache.put(event.request, response.clone());
            }
            return Promise.resolve(response);
          } else {
            return Promise.reject('network request failed');
          }
        }),
      ]);
    })
  );
});

self.addEventListener('message', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return fetch(event.data.url).then(response => {
        console.log("got data");
        return cache.put(event.data.url, response);
      });
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log("[activate] attempting to uninstall previous service worker");

  var cacheWhitelist = [CACHE];

  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (cacheWhitelist.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    }).then(function() {
      console.log("[activate] removed previous cache");
    }).then(function () {
      self.clients.claim();
      console.log("[activate] claiming service worker");
    })
  );
});
