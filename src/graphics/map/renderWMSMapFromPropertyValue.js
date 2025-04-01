import { fixCapabilitiesURL } from 'blocks/graphics/util';
import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import renderWMSTileLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderWMSTileLayerMap';

const urlMatchesAllPatterns = (url, patternConfig) => {
  const patterns = Array.isArray(patternConfig) ? patternConfig : [patternConfig];
  const lowerCaseURL = url.toLowerCase();
  return patterns.every((pattern) => lowerCaseURL.match(pattern));
};

/**
 * Tries to find urls based on property and pattern
 *
 * @param {object} md
 * @param {string} ruri
 * @param {object} data
 * @param {string} data.property
 * @param {string} data.pattern
 * @returns {Array}
 */
const findUrlFromProperty = (md, ruri, data) => {
  const { property, pattern } = data;
  const accessUrls = md.find(ruri, property).map((statement) => statement.getValue());
  if (!pattern) {
    return accessUrls;
  }
  return accessUrls.filter((url) => {
    return urlMatchesAllPatterns(url, pattern);
  });
};

const getMapConfig = (data, urlFromProperty) => {
  const layers = [
    ...data.layers,
    {
      type: 'wms',
      fetchFromCapabilities: true,
      capabilitiesUrl: fixCapabilitiesURL(urlFromProperty[0], data, 'wms'), // Fix the url and add proxy if given
    },
  ];
  return { ...data, layers };
};

/**
 * If url is found completes the data object and renders a geographical map
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @param {Entry} entry
 * @returns {Promise<void>}
 */
export const renderWMSMapFromPropertyValue = async (node, data, entry) => {
  const md = entry.getAllMetadata();
  const ruri = entry.getResourceURI();
  const urlFromProperty = findUrlFromProperty(md, ruri, data);
  if (urlFromProperty.length === 0) return;
  const mapConfig = getMapConfig(data, urlFromProperty);
  mapConfig.mapRenderer = renderWMSTileLayerMap;
  await renderOpenLayerMap(node, mapConfig);
};
