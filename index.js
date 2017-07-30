var Metalsmith = require('metalsmith');
var msIf = require('metalsmith-if');
var markdown = require('metalsmith-markdown');
var layouts = require('metalsmith-layouts');
var permalinks = require('metalsmith-permalinks');
var autoprefixer = require('metalsmith-autoprefixer');
var collections = require('metalsmith-collections');
var drafts = require('metalsmith-drafts');
var updated = require('metalsmith-updated');
var feed = require('metalsmith-feed');
var watch = require('metalsmith-watch');
var serve = require('metalsmith-serve');
var minifier = require('metalsmith-html-minifier');
var branch = require('metalsmith-branch');
var inline = require('metalsmith-inline-source');
var anchors = require("metalsmith-headings-identifier");
var wordcount = require("metalsmith-word-count");
var nested = require('metalsmith-nested');
var writemetadata = require('metalsmith-writemetadata');
var dates = require('metalsmith-date-formatter');
var ignore = require('metalsmith-ignore');

var fs = require('fs')
var path = require('path')

var shouldServe = false;

process.argv.forEach(function(arg) {
  if(arg === "serve") {
    shouldServe = true;
  }
});

Metalsmith(__dirname)          // instantiate Metalsmith in the cwd
  .metadata({
    title: "cgm616",
    description: "This is a website.",
    site: {
      url: "localhost:8080",
    },
  })
  .source('./src')        // specify source directory
  .destination('./build')     // specify destination directory
  .use(msIf(
    shouldServe,
    watch({
      paths: {
        "nested/**/*.*": "**/*",
        "${source}/**/*.*": "**/*",
      },
    })
  ))
  .use(msIf(shouldServe, serve()))
  .use(drafts())
  .use(ignore(['**/.*.*.swp', '**/.*.*.swo']))
  .use(collections({
    articles: 'articles/*.md'
  }))
  .use(markdown())
  .use(permalinks({relative: false}))
  .use(updated())
  .use(dates({
    dates: [
      {
        key: 'created',
        format: 'MMMM Do YYYY'
      }
    ]
  }))
  .use(wordcount())
  .use(feed({
    collection: 'articles'
  }))
  .use(autoprefixer())
  .use(nested({
    directory: 'nested',
    generated: 'layouts'
  }))
  .use(layouts({
    engine: 'handlebars',
    directory: 'layouts'
  })) 
  .use(branch('index.html').use(inline({
    compress: true,
    rootpath: path.resolve('src/'),
  })))
  // .use(writemetadata({
  //       pattern: ['**/*.md', '**/*.html']
  //       , ignorekeys: ['next', 'previous']
  //       , bufferencoding: 'utf8'        // also put 'content' into .json
  // }))
  .use(anchors())
  .use(minifier())
  .build(function(err) {       // this is the actual build process
    if (err) throw err;    // throwing errors is required
  });
