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

  /*
  eleventyConfig.addPlugin(pluginRss)

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: true,
    excerpt_separator: "<!-- excerpt -->",
    excerpt_alias: 'excerpt'
  })
  */

  /*================================*/
  /*   markdown options   */
  /*================================*/

  // Set up markdown-it
  let md = markdownIt({
    html: true,
    breaks: true,
    typographer: true,
  })
    .use(markdownItFootnote)
    .use(markdownItAttrs)
    .use(markdownItDiv);

  // Make markdown-it-footnote output TufteCSS-compatible notes
  md.renderer.rules.footnote_ref = (tokens, idx, options, env, slf) => {
    const id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

    let note = env.footnotes.list[id - 1];
    let rendered = slf.render(note.tokens, options, env);

    return `<label for="sn-${id}" class="margin-toggle sidenote-number"></label><input type="checkbox" id="sn-${id}" class="margin-toggle"/><span class="sidenote">${rendered}</span>`
  };


  // Save previously-set image renderer
  let defaultImageRender = md.renderer.rules.image || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  // Replace the image renderer
  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    console.log(token);
    let renderedCaption = self.render(token.children, options, env);
    console.log(renderedCaption);
    let src = token.attrGet('src');
    const title = token.attrGet('title') || "";
    const alt = token.attrGet('alt') || ""; // TODO: fix alt text not working right!
    const classes = token.attrGet('class') || "";
    const width = token.attrGet('width');
    const height = token.attrGet('height');
    const widths = token.attrGet('widths');
    const formats = token.attrGet('formats');
    const sizes = token.attrGet('sizes');
    const styles = token.attrGet('style');

    if (src.startsWith('/assets')) {
      src = 'src' + src
    }

    console.log("running processing");
    let html = useImage(src, alt, renderedCaption, title, classes, width, height, widths, formats, sizes, styles);
    console.log("ran processing");

    return html;
  }

  // Get ride of footnote separator
  let fn_block_open = md.renderer.rules.footnote_block_open;
  md.renderer.rules.footnote_block_open = (tokens, idx, options, env, slf) => {
    return fn_block_open(tokens, idx, options, env, slf)
      .replace(options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n', '');
  }

  // Add altered markdown-it as markdown library
  eleventyConfig.setLibrary('md', md);

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
    return useImage(args.src, args.alt, args.caption, args.title, args.className, args.width, args.height, args.widths, args.formats, args.sizes);
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

/** Handles image processing and markup creation for the image shortcode and
 * markdown plugin.
 */
function useImage(src, alt, caption, title, className = "", width, height, widths, formats, sizes, styles) {
  // We want to auto-generate the appropriate responsive settings based on the
  // image and its style of display:
  // - `portrait`:
  // - `margin`: can be as wide as 307px, and below that, shrinks down to 94px
  //    so want 100px, 200px, 400px, 800px, 1240px
  // - `fullwidth`: can be as wide as 1240px, and below that, most of viewport
  //    so want 400px, 800px, 1240px, 2480px, 3720px
  // - none: can be as wide as 70ch (814px), and below that, most of viewport
  //    so want 400px, 820px, 1240px, 1640px, 2480px

  // Handle formats
  formats = formats || ['webp', 'jpeg'];

  // Calculate sizes and widths
  if (!widths) {
    if (className.includes("portrait")) {
      widths = [200, 400, 600, 820, 1240];
      sizes = "(min-width: 1240px) 814px, 98vw";
    } else if (className.includes("margin")) {
      widths = [100, 200, 400, 820, 1240];
      sizes = "(min-width: 1240px) 307px, 50vw";
    } else if (className.includes("fullwidth")) {
      widths = [400, 820, 1240, 1640, 2480, 3720];
      sizes = "(min-width: 1240px) 1240px, 98vw"
    } else {
      widths = [400, 820, 1240, 1640, 2480];
      sizes = "(min-width: 1240px) 814px, 98vw"
    }
  }

  let options = {
    widths: [...widths, null],
    formats: [...formats, null],
    outputDir: '_site/images',
    urlPath: '/images',
    filenameFormat: function (hash, src, width, format, _options) {
      const { name } = path.parse(src);
      return `${name}-${hash}-${width}.${format}`;
    }
  };

  // Process images asynchronously
  Image(src, options);

  // Synchronously get image metadata
  let imageMetadata = Image.statsSync(src, options);

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
    width: width || largestUnoptimizedImg.width,
    height: height || largestUnoptimizedImg.height,
    alt: alt,
    title: title,
    style: styles,
    loading: 'lazy',
    decoding: 'async',
    class: className,
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
}
