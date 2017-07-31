"use strict";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', {scope: '/'})
  .then(function(reg) {
    // registration worked
    console.log('Registration succeeded. Scope is ' + reg.scope);
  }).catch(function(error) {
    // registration failed
    console.log('Registration failed with ' + error);
  });
}

window.onload = function() {
  var x = document.getElementsByTagName("a");
  var i;
      for (i = 0; i < x.length; i++) {
        var href = x[i].getAttribute("href");
        if(href.substr(0,1) == '/' && href !== window.location.pathname) {
          x[i].addEventListener("mouseenter", (function() {
            if (!navigator.serviceWorker.controller) {
              console.log("no controller");
              return;
            }
            navigator.serviceWorker.controller.postMessage({
              url: this.getAttribute('href'),
              command: 'fetch'
            });
          }),
            { 'once': true, 'passive': true, }
          );
        }
      }
    }
};
