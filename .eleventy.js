/* plugins */
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');
const Image = require('@11ty/eleventy-img');

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

  // `src/_static` is for static files
  // `src/assets` is for files that need to be processed
  eleventyConfig.addPassthroughCopy({ "src/_static": "./" });

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

  // Much of image shortcode taken from:
  // https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/
  const imageShortcode = async (
    args
  ) => {
    let src = args.src;
    let alt = args.alt;
    let caption = args.caption;
    let title = args.title;
    let className = args.className;
    // TODO: better way of handling these things
    let widths = args.widths || [400, 800, 1240];
    let formats = args.formats || ['webp', 'jpeg'];
    let sizes = args.sizes || '96vw';

    // Process images
    const imageMetadata = await Image(src, {
      widths: [...widths, null],
      formats: [...formats, null],
      outputDir: '_site/images',
      urlPath: '/images',
      filenameFormat: function (hash, src, width, format, _options) {
        const { name } = path.parse(src);
        return `${name}-${hash}-${width}.${format}`;
      }
    });

    console.log(imageMetadata);

    // Build source tags
    const sourceHtmlString = Object.values(imageMetadata)
      // Map each format to the source HTML markup
      .map((images) => {
        // The first image's sourceType is the same as those of all other images
        // belonging to this format (e.g., image/webp).
        const { sourceType } = images[0];

        // Use our util from earlier to make our lives easier
        const sourceAttributes = stringifyAttributes({
          type: sourceType,
          // srcset needs to be a comma-separated attribute
          srcset: images.map((image) => image.srcset).join(', '),
          sizes,
        });

        // Return one <source> per format
        return `<source ${sourceAttributes}>`;
      })
      .join('\n');

    // Build img tag
    const getLargestImage = (format) => {
      const images = imageMetadata[format];
      return images[images.length - 1];
    }

    const largestUnoptimizedImg = getLargestImage(formats[1]);

    const imgAttributes = stringifyAttributes({
      src: largestUnoptimizedImg.url,
      width: largestUnoptimizedImg.width,
      height: largestUnoptimizedImg.height,
      alt: alt,
      title: title,
      loading: 'lazy',
      decoding: 'async',
    });

    const imgHtmlString = `<img ${imgAttributes}>`;

    const pictureAttributes = stringifyAttributes({
      class: className,
    });

    const picture = `<picture ${pictureAttributes}>${sourceHtmlString}${imgHtmlString}</picture>`;

    if (caption) {
      return `<figure>${picture}<figcaption>${caption}</figcaption></figure>`;
    } else {
      return `<figure>${picture}</figure>`;
    }
  };

  eleventyConfig.addShortcode('image', imageShortcode);

  /*=================*/
  /*    general config      */
  /*=================*/
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

/** Maps a config of attribute-value pairs to an HTML string
 * representing those same attribute-value pairs.
 * https://www.aleksandrhovhannisyan.com/blog/eleventy-image-plugin/
 */
const stringifyAttributes = (attributeMap) => {
  return Object.entries(attributeMap)
    .map(([attribute, value]) => {
      if (typeof value === 'undefined') return '';
      return `${attribute}="${value}"`;
    })
    .join(' ');
};
