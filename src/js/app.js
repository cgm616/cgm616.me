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
    console.log("iterating over is");
    x[i].addEventListener("mouseenter", (function() {
      console.log("link has been moused over");
      var href = this.getAttribute("href");
      if(href.substr(0,1) == '/') {
        console.log("link is internal");
        fetch(href);
      }
    }),{
      'once': true,
      'passive': true,
    });
  } 
};
