import { getBoolean } from 'blocks/utils/configUtil';
import getEntry from 'blocks/utils/getEntry';
import { renderWMSMapFromPropertyValue } from 'blocks/graphics/map/renderWMSMapFromPropertyValue';
import { renderMapFromWgs84 } from 'blocks/graphics/map/renderMapFromWgs84';
import { renderMapFromAddress } from 'blocks/graphics/map/renderMapFromAddress';
import { getBaseLayersData } from 'blocks/graphics/map/baseLayers';
import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import renderVectorLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderVectorLayerMap';

/**
 * Check if the entry has a property value matching any one of the constraints
 *
 * @param {rdfjson/Graph} md
 * @param {string} ruri
 * @param {object} constraints
 * @returns {boolean}
 */
const entryNotMatchingAnyConstraints = (md, ruri, constraints) => {
  const constraintProperties = Object.keys(constraints);
  const matchFound = constraintProperties.every((property) => {
    const constraintValuesArray = Array.isArray(constraints[property])
      ? constraints[property]
      : [constraints[property]];
    const entryValuesForProperty = md.find(ruri, property).map((stmt) => stmt.getValue());
    return constraintValuesArray.find((value) => entryValuesForProperty.includes(value));
  });
  return !matchFound;
};

const testProperty = (md, ruri, property) => {
  if (!property) return false;
  return md.find(ruri, property).length > 0;
};

/**
 * Checks if wgs84:lat and wgs84:long are set
 *
 * @param {rdfjson/Graph} md
 * @param {string} ruri
 * @returns {boolean}
 */
const testWgs84 = (md, ruri) => {
  return (
    md.findFirstValue(ruri, 'http://www.w3.org/2003/01/geo/wgs84_pos#lat') &&
    md.findFirstValue(ruri, 'http://www.w3.org/2003/01/geo/wgs84_pos#long')
  );
};

/**
 * Checks if schema:address is set
 *
 * @param {rdfjson/Graph} md
 * @param {string} ruri
 * @returns {boolean}
 */
const testAddress = (md, ruri) => {
  return !!md.findFirstValue(ruri, 'schema:address');
};

/**
 * Find a mapType based on the metadata and config
 *
 * @param {rdfjson/Graph} md
 * @param {string} ruri
 * @param {object} data
 * @returns {string}
 */
const getMapType = (md, ruri, data) => {
  if (testProperty(md, ruri, data.property)) return 'MAP_FROM_PROPERTY_VALUE';
  if (testWgs84(md, ruri)) return 'MAP_FROM_WGS84';
  if (testAddress(md, ruri)) return 'MAP_FROM_ADDRESS';
  return 'UNKNOWN';
};

const getMapConfig = (data, layers, mapType) => {
  const { width = '100%', height = '300px', legend = true, forceHttps, zoom, maxzoom, popup, popuponload } = data;
  return {
    width,
    height,
    layers,
    zoom: parseInt(zoom, 10) || 8,
    maxzoom: parseInt(maxzoom, 10) || 15,
    popup,
    hasPopup: Boolean(popup),
    forceHttps: getBoolean(forceHttps, false),
    popuponload: getBoolean(popuponload, false),
    layerSwitcher: mapType === 'MAP_FROM_PROPERTY_VALUE' || layers.length > 1,
    legend,
    scaleLine: getBoolean(data.scaleLine, false),
  };
};

/**
 * The map block provides a map view based on the openlayers library with the current entry positioned,
 * the position can either be detected from explicit positions in the metadata (provided via the wgs84:lat and
 * wgs84:long, see basic geo) or via lookup of an address. (Currently the address information is hardcoded to be
 * detected via a schema.org construction in the form of a schema:schema property pointing to a blank node with
 * schema:streetAddress, schema:addressRegion and schema:addressLocality properties.)
 * Given a named entry property holding a wms capability url a map with all available wms layers will be rendered
 * instead.
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @param {object} [data.constraints] - nothing will render if the entry matches any property: values
 * @returns {Promise<void>}
 */
const renderMap = async (node, data) => {
  getEntry(data, async (entry) => {
    if (!entry) return;
    const md = entry.getAllMetadata();
    const ruri = entry.getResourceURI();
    if (data.constraints && entryNotMatchingAnyConstraints(md, ruri, data.constraints)) return;
    const mapType = getMapType(md, ruri, data);
    const baseLayers = getBaseLayersData(data);
    const mapConfig = { ...data, ...getMapConfig(data, baseLayers, mapType) };
    switch (mapType) {
      case 'MAP_FROM_PROPERTY_VALUE':
        await renderWMSMapFromPropertyValue(node, mapConfig, entry);
        break;
      case 'MAP_FROM_WGS84':
        await renderMapFromWgs84(node, mapConfig);
        break;
      case 'MAP_FROM_ADDRESS':
        await renderMapFromAddress(node, mapConfig);
        break;
      case 'UNKNOWN':
        mapConfig.mapRenderer = renderVectorLayerMap;
        await renderOpenLayerMap(node, mapConfig);
        break;
      default:
        throw new Error(`Error: mapType: ${mapType} not supported`);
    }
  });
};

export default renderMap;
