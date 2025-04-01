import { vizNamespace } from 'blocks/graphics/visualization/visualizationUtil';
import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import { getBoolean } from 'blocks/utils/configUtil';
import { getBaseLayersData } from 'blocks/graphics/map/baseLayers';
import renderWMSTileLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderWMSTileLayerMap';

/**
 * Extracts layer config from entry metadata
 *
 * @param {object} params
 * @param {Entry} params.entry
 * @param {Array<number>} params.boundingBox
 * @returns {Array<object>}
 */
const getWMSLayersData = ({ entry, boundingBox }) => {
  const ruri = entry.getResourceURI();
  const md = entry.getAllMetadata();
  const mdLayers = JSON.parse(md.findFirstValue(ruri, vizNamespace.layers)).reverse();
  const url = md.findFirstValue(ruri, vizNamespace.wmsBaseURI);
  const type = 'wms';
  return mdLayers.map((layer) => ({
    ...layer,
    type,
    url,
    boundingBox,
  }));
};

const getMapConfig = (data, layers) => {
  const { entry, width = '100%', height = '360px', legend, scaleLine } = data;
  const ruri = entry.getResourceURI();
  const md = entry.getAllMetadata();
  const extent = JSON.parse(md.findFirstValue(ruri, vizNamespace.extent));
  const boundingBox = JSON.parse(md.findFirstValue(ruri, vizNamespace.initialView));
  const showLegend = md.findFirstValue(ruri, vizNamespace.legendControl) || legend;
  const showScaleLine = md.findFirstValue(ruri, vizNamespace.scaleLineControl) || scaleLine;
  return {
    ...data,
    width,
    height,
    extent: boundingBox || extent,
    legend: getBoolean(showLegend, true),
    layerSwitcher: true,
    scaleLine: getBoolean(showScaleLine, false),
    layers,
  };
};
/**
 * Renders a geographical map with baselayers and WMS layers from entry metadata
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @returns {Promise<void>}
 */
export const renderMapFromWmsVisualization = async (node, data) => {
  const baseLayers = getBaseLayersData(data);
  const mapConfig = { ...data, ...getMapConfig(data, baseLayers) };
  mapConfig.mapRenderer = renderWMSTileLayerMap;
  mapConfig.layers.push(...getWMSLayersData(data));
  await renderOpenLayerMap(node, mapConfig);
};
