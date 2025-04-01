import { namespaces } from '@entryscape/rdfjson';
import DOMUtil from 'blocks/utils/htmlUtil';

/**
 * Adds image-icons to the node
 *
 * @param {IconConfig} data - Block config
 * @param {Array<string>} values - Values to match with 'data.icons'
 * @param {Element} node - Parent element for the icon
 * @returns {void}
 */
const renderImgIcons = (data, values, node) => {
  if (values.length === 0 && 'fallback' in data) {
    DOMUtil.create(
      'img',
      {
        class: `esbIcon__img ${data.class || ''}`,
        src: namespaces.expand(data.fallback),
        alt: data.altText,
      },
      node
    );
    return;
  }
  values.forEach((value) => {
    DOMUtil.create(
      'img',
      {
        class: `esbIcon__img ${data.class || ''}`,
        src: data.icons ? data.icons[value] : value,
        alt: data.altTexts
          ? data.altTexts[value] || data.altText
          : data.altText,
      },
      node
    );
  });
};

export default renderImgIcons;
