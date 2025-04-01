import filter from 'blocks/utils/filter';
import getEntry from 'blocks/utils/getEntry';
import { namespaces } from '@entryscape/rdfjson';
import renderFaIcons from './components/renderFaIcons';
import renderImgIcons from './components/renderImgIcons';

/**
 * Checks if all mandatory parameters are set and have the right format
 *
 * @param {IconConfig} data - Block config
 * @returns {boolean}
 */
function configComplete(data) {
  const mandatoryProperties = 'property' in data && 'icons' in data;
  const correctTypes =
    typeof data.property === 'string' && typeof data.icons === 'object';
  return mandatoryProperties && correctTypes;
}

/**
 * Add default values to data object
 *
 * @param {IconConfig} data - Block config
 * @returns {{style: 'img' | 'fa', limit: number, altText: string, nodetype: 'literal' | 'uri'}}
 */
const defaultData = ({
  style = 'img',
  limit = 10,
  altText = 'icon',
  nodetype = 'literal',
}) => ({ style, limit: parseInt(limit, 10), altText, nodetype });

/**
 * Expands any shorthand uri's in 'data.icon', 'data.altTexts' and 'data.fallback'
 *
 * @param {IconConfig} data - Block config
 * @returns {{property: string, altTexts: object, icons: object, fallback: string}}
 */
const expandDataURIShorthands = (data) => {
  const expandedData = {
    icons: {},
    altTexts: {},
    fallback: '',
    property: '',
  };
  if (typeof data.icons === 'object' && data.icons !== null) {
    Object.keys(data.icons).forEach((key) => {
      expandedData.icons[namespaces.expand(key)] = namespaces.expand(
        data.icons[key]
      );
    });
  }
  if (typeof data.altTexts === 'object' && data.icons !== null) {
    Object.keys(data.altTexts).forEach((key) => {
      expandedData.altTexts[namespaces.expand(key)] = data.altTexts[key];
    });
  }
  if (typeof data.fallback === 'string') {
    expandedData.fallback = namespaces.expand(data.fallback);
  }
  if (typeof data.property === 'string') {
    expandedData.property = namespaces.expand(data.property);
  }
  return expandedData;
};

/**
 * Prepares the config data
 *
 * @param {IconConfig} data - Icon block config
 * @returns {IconConfig}
 */
const getIconConfig = (data) => {
  const completedData = { ...data, ...defaultData(data) };
  return { ...completedData, ...expandDataURIShorthands(completedData) };
};

/**
 * Sorts the values in the same order as in data.icons object and limits the number of icons
 *
 * @param {number} limit - Max number of icons to add
 * @param {Array<string>} values - Values to be sorted
 * @param {{string: string}} iconsObject - The object with properties used for sorting
 * @returns {Array<string>} - Ordered values
 */
const sortAndLimitValues = (limit, values, iconsObject) => {
  const sortedValues = [];
  Object.getOwnPropertyNames(iconsObject).forEach((valueToMatch) => {
    if (values.includes(valueToMatch)) {
      sortedValues.push(valueToMatch);
    }
  });
  return sortedValues.slice(0, limit);
};

/**
 * Extracts all the values for a given property from the entry metadata and returns max number of results sorted
 *
 * @param {object} entry
 * @param {IconConfig} iconConfig
 * @returns {Array<string>}
 */
const mapEntryValuesToIcons = (entry, iconConfig) => {
  const valuesArray = entry
    .getAllMetadata()
    .find(entry.getResourceURI(), iconConfig.property)
    .map((stmt) => stmt.getValue());
  return sortAndLimitValues(iconConfig.limit, valuesArray, iconConfig.icons);
};

/**
 * @typedef {object} IconConfig
 * @property {string} [fallback] - Fallback icon do display when no match is found
 * @property {string} property - The property to use for matching the icon
 * @property {'fa' | 'img'} [style='img'] - Type of icon. fa for font awesome and img for img-element. Defaults to img
 * @property {{string: string}} [icons] - For matching property value to icon. For example map: 'fas fa-map'
 * @property {string} [entry] - The entry to use for the block, usually fetched from a list or the url
 * @property {{string: string}} [altTexts] - For matching property value to "alt" text on img-icon or text for
 * screen readers for fa-icon
 * @property {string} [altText='icon'] - Fallback text for "alt" on img-icon or text for screen readers for fa-icon
 * @property {string | number} [limit=10] - Max number of icons to add. Defaults to 10
 * @property {string} [class] - Optional extra class for image icons
 * @property {string} [block] - Custom block name
 * @property {'icon'} extends - For extending this block
 */

/**
 * Render an icons for each value of a property
 * The configurable properties 'fallback' and 'icons' will decide which icon to render
 * It is possible to use fontawesome style icons <i class="fas fa-icon"></i> by using the "fa-icon" name and
 * img-icon by using the img-url. To avoid writing long urls use global parameter "namespaces" and set nodetype to "uri"
 *
 * @function renderIcon
 * @param {Element} node - Node to add the icon/icons to
 * @param {IconConfig} data - Block config
 */
const icon = (node, data) => {
  if (!configComplete(data)) {
    console.error('Not enough information in configuration to create icon');
  } else {
    filter.guard(node, data.if);
    getEntry(data, (entry) => {
      if (!entry) return;
      const iconConfig = getIconConfig(data);
      const iconValuesArray = mapEntryValuesToIcons(entry, iconConfig);

      if (iconConfig.style === 'fa') {
        renderFaIcons(iconConfig, iconValuesArray, node);
      } else if (iconConfig.style === 'img') {
        renderImgIcons(iconConfig, iconValuesArray, node);
      }
    });
  }
};
export default icon;
