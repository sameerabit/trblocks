import DOMUtil from 'blocks/utils/htmlUtil';

/**
 * Adds fa-icons and a screen-reader texts to the node
 *
 * @param {IconConfig} data - Block config
 * @param {Array<string>} values - Values to match with 'data.icons'
 * @param {Element} node - Parent element for the icon
 * @returns {void}
 */
const renderFaIcons = (data, values, node) => {
  if (values.length === 0 && 'fallback' in data) {
    DOMUtil.create(
      'i',
      {
        class: `${data.fallback} esbIcon__fa`,
        'aria-hidden': 'true',
      },
      node
    );
    DOMUtil.create(
      'span',
      {
        class: 'sr-only',
        innerText: data.altText,
      },
      node
    );
    return;
  }
  values.forEach((value) => {
    DOMUtil.create(
      'i',
      {
        class: `${data.icons[value]} esbIcon__fa`,
        'aria-hidden': 'true',
      },
      node
    );
    DOMUtil.create(
      'span',
      {
        class: 'sr-only',
        innerText: data.altTexts
          ? data.altTexts[value] || data.altText
          : data.altText,
      },
      node
    );
  });
};
export default renderFaIcons;
