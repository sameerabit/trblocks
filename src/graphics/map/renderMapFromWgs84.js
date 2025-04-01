import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import { getPopupContentFromTemplate } from 'blocks/graphics/util';
import renderVectorLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderVectorLayerMap';

const getLongLatFromWgs84 = (entry) => {
  const md = entry.getAllMetadata();
  const ruri = entry.getResourceURI();
  const long = md.findFirstValue(ruri, 'http://www.w3.org/2003/01/geo/wgs84_pos#long');
  const lat = md.findFirstValue(ruri, 'http://www.w3.org/2003/01/geo/wgs84_pos#lat');
  return {
    long: parseFloat(long.replace(',', '.')),
    lat: parseFloat(lat.replace(',', '.')),
  };
};

/**
 * Completes the config (data) with popup content and wgs84 metadata values
 *
 * @param {object} data
 * @param {Entry} data.entry
 * @param {Array<object>} data.layers
 * @param {string} data.popup - Handlebar template
 * @returns {object} - completed config (data) object
 */
const getMapConfig = (data) => {
  const { long, lat } = getLongLatFromWgs84(data.entry);
  const featureInfoData = {};
  if (data.popup) {
    featureInfoData.popupContent = getPopupContentFromTemplate(data);
  }
  const layers = [
    ...data.layers,
    {
      type: 'point',
      points: [{ lonLatCoordinates: [long, lat], featureInfoData }],
    },
  ];
  return { ...data, layers };
};

/**
 * Renders a geographical map with baselayers and vector layer from entry metadata wgs84 values
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @returns {Promise<void>}
 */
export const renderMapFromWgs84 = async (node, data) => {
  const mapConfig = getMapConfig(data);
  mapConfig.mapRenderer = renderVectorLayerMap;
  await renderOpenLayerMap(node, mapConfig);
};
