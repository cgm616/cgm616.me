/* plugins */
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');

const markdownIt = require('markdown-it');
const markdownItFootnote = require('markdown-it-footnote');
const markdownItAttrs = require('markdown-it-attrs');
const markdownItDiv = require('markdown-it-div');

/* other deps */
const browserslist = require("browserslist");
const { browserslistToTargets, bundleAsync } = require("lightningcss");

/* node deps */
const path = require("node:path");


/*
const pluginRss = require('@11ty/eleventy-plugin-rss')

const { 
  getAllPosts, 
  getCategoryList,
  getCategorisedPosts 
} = require('./config/collections')

const { 
  readableDate 
} = require('./config/filters')

const { 
  imageShortcode 
} = require('./config/shortcodes')
*/


module.exports = function (eleventyConfig) {
  /*================================*/
  /*   plugins   */
  /*================================*/

  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  /*================================*/
  /*   markdown options   */
  /*================================*/

  let md = markdownIt({
    html: true,
    breaks: true,
    typographer: true,
  })
    .use(markdownItFootnote)
    .use(markdownItAttrs)
    .use(markdownItDiv);

  // need to eliminate:
  // - render_footnote_block_open
  // - render_footnote_block_close
  // - render_footnote_open
  // - render_footnote_close
  // - render_footnote_anchor
  // -

  /*
<label for="sn-extensive-use-of-sidenotes" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sn-extensive-use-of-sidenotes" class="margin-toggle"/><span class="sidenote">This is a sidenote.</span>
  */

  function render_footnote_ref_tufte(tokens, idx, options, env, slf) {
    const id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    // const caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);

    let note = env.footnotes.list[id - 1];
    console.log(note);

    let rendered = slf.render(note.tokens, options, env);
    console.log(rendered);

    // `<sup class="footnote-ref"><a href="#fn${id}" id="fnref${refid}">${caption}</a></sup>`
    return `<label for="sn-${id}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sn-${id}" class="margin-toggle"/><span class="sidenote">${rendered}</span>`
  }

  md.renderer.rules.footnote_ref = render_footnote_ref_tufte;

  eleventyConfig.setLibrary('md', md);
  /*
  eleventyConfig.addPlugin(pluginRss)

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: "<!-- excerpt -->",
    excerpt_alias: 'excerpt'
  })
  */

  /*===================================================*/
  /* CSS processing  */
  /*===================================================*/

  // Recognize CSS as a "template language"
  eleventyConfig.addTemplateFormats("css");

  // Process CSS with LightningCSS
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function (_inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      if (parsed.name.startsWith("_")) {
        return;
      }

      let targets = browserslistToTargets(browserslist("> 0.2%, last 2 versions, Firefox ESR, not dead"));

      return async () => {
        // Switch to the `transform` function if you don't
        // plan to use `@import` to merge files
        let { code } = await bundleAsync({
          filename: inputPath,
          minify: true,
          sourceMap: false,
          targets,
        });
        return code;
      };
    },
  });

  /*===================================================*/
  /* files that need to be copied to the build folder  */
  /*===================================================*/

  eleventyConfig.addPassthroughCopy({ "src/_static": "./" });


  /*
  eleventyConfig.addPassthroughCopy('./src/assets/social-image.jpg')
  eleventyConfig.addPassthroughCopy('./src/assets/icons')
  eleventyConfig.addPassthroughCopy('./src/assets/sprite.svg')
  eleventyConfig.addPassthroughCopy({
      'node_modules/svg-icon-sprite/dist/svg-icon-sprite.js': 'assets/svg-icon-sprite.js'
  })
  */


  /*=================*/
  /*     Layouts     */
  /*=================*/

  eleventyConfig.addLayoutAlias('page', 'layouts/page')
  eleventyConfig.addLayoutAlias('article', 'layouts/article')
  eleventyConfig.addLayoutAlias('index', 'layouts/index')
  eleventyConfig.addLayoutAlias('list', 'layouts/list')



  /*=================*/
  /*   Collections   */
  /*=================*/
  /*
  eleventyConfig.addCollection('blog', getAllPosts)
  eleventyConfig.addCollection('categoryList', getCategoryList)
  eleventyConfig.addCollection('categorisedPosts', getCategorisedPosts)
  */


  /*=================*/
  /*     Filters     */
  /*=================*/
  /*
  eleventyConfig.addFilter('readableDate', readableDate)
  */


  /*=================*/
  /*    shortcodes   */
  /*=================*/
  /*
  eleventyConfig.addNunjucksAsyncShortcode('image', imageShortcode)
  */

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data'
    },
    markdownTemplateEngine: 'njk'
  }
}
