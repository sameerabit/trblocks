import filter from 'blocks/utils/filter';
import getEntry from 'blocks/utils/getEntry';
import getTextContent from 'blocks/utils/getTextContent';
import error from 'blocks/boot/error';
import template from 'lodash-es/template';
import handlebars from 'blocks/boot/handlebars';
import htmlUtil from 'blocks/utils/htmlUtil';
import { getBoolean } from 'blocks/utils/configUtil';

const loadMicromark = async () => {
  const imports = [
    import(/* webpackChunkName: "micromark" */ 'micromark').then((module) => module.micromark),
    import(
      /* webpackChunkName: "micromark-extension-gfm-autolink-literal" */ 'micromark-extension-gfm-autolink-literal'
    ),
  ];
  return Promise.all(imports).then(([micromark, { gfmAutolinkLiteral, gfmAutolinkLiteralHtml }]) => {
    return { micromark, gfmAutolinkLiteral, gfmAutolinkLiteralHtml };
  });
};

/**
 * @param {number} headingLevelStart
 * @param {DocumentFragment} fragment
 * @returns {DocumentFragment}
 */
const getHeadingLevelAdjustedFragment = (headingLevelStart, fragment) => {
  const adjustment = headingLevelStart - 1;
  const highestLevelToAdjustTo = 6;
  const headings = fragment.querySelectorAll('h1, h2, h3, h4, h5');
  headings.forEach((heading) => {
    const headingLevel = parseInt(heading.tagName.slice(1), 10);
    const adjustedLevel = headingLevel + adjustment;
    const newLevel = adjustedLevel <= highestLevelToAdjustTo ? adjustedLevel : highestLevelToAdjustTo;
    const newHeading = document.createElement(`h${newLevel}`);
    newHeading.innerHTML = heading.innerHTML;
    heading.replaceWith(newHeading);
  });
  return fragment;
};

/**
 * @param {object} data
 * @param {string|number} data.hl
 * @param {string} htmlText
 * @returns {DocumentFragment}
 */
const getFragment = ({ hl = 1 }, htmlText) => {
  const fragment = document.createRange().createContextualFragment(htmlText);
  const firstHeadingLevel = parseInt(hl, 10);
  if (firstHeadingLevel > 6 && firstHeadingLevel <= 1) {
    return fragment;
  }
  return getHeadingLevelAdjustedFragment(firstHeadingLevel, fragment);
};

const text = (node, data) => {
  filter.guard(node, data.if);
  if (data.class) {
    htmlUtil.addClass(node, data.class);
  }
  if (data.json) {
    fetch(data.json)
      .then((d) => d.json())
      .then((loadedData) => {
        if (data.content) {
          node.innerHTML = template(data.content)(loadedData);
        } else if (data.property) {
          node.innerHTML = loadedData[data.property];
        } else if (typeof data.ondata === 'function') {
          data.ondata(loadedData);
        }
      })
      .catch((e) => {
        data.error = e.toString();
        error(node, data);
      });
  } else {
    getEntry(data, (entry) => {
      if (entry) {
        let textContent = getTextContent(data, entry);
        if (textContent) {
          if (getBoolean(data.markdown, false)) {
            loadMicromark()
              .then(({ micromark, gfmAutolinkLiteral, gfmAutolinkLiteralHtml }) => {
                textContent = micromark(textContent, {
                  extensions: [gfmAutolinkLiteral()],
                  htmlExtensions: [gfmAutolinkLiteralHtml()],
                });
                const fragment = getFragment(data, textContent);
                node.appendChild(fragment);
              })
              .catch((e) => console.error(e));
            return;
          }
          node.innerHTML = textContent;
        } else if (data.fallback) {
          handlebars.run(node, data, data.fallback, entry, false);
        }
      }
    });
  }
};
export default text;
