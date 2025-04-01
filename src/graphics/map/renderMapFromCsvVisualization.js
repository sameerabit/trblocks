import { getCsvData, getPropertiesFromCsvData, isValidGeoData } from 'blocks/graphics/util';
import { vizNamespace } from 'blocks/graphics/visualization/visualizationUtil';
import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import { getBaseLayersData } from 'blocks/graphics/map/baseLayers';
import renderVectorLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderVectorLayerMap';
import { getBoolean } from 'blocks/utils/configUtil';

/**
 * Creates config object for vector layer from entry metadata and CSV content
 *
 * @param {Entry} entry
 * @returns {Promise<{type: string, title: *, points: *}>}
 */
const getCSVLayerData = async (entry) => {
  const ruri = entry.getResourceURI();
  const md = entry.getAllMetadata();
  const csvData = await getCsvData(ruri, md, entry);
  const xAxisField = md.findFirstValue(ruri, vizNamespace.xAxis);
  const yAxisField = md.findFirstValue(ruri, vizNamespace.yAxis);
  const featureTitle = md.findFirstValue(ruri, vizNamespace.featureTitle);
  if (isValidGeoData(csvData, xAxisField, yAxisField)) {
    const pointDataFromFile = getPropertiesFromCsvData(csvData, xAxisField, yAxisField, featureTitle);
    const visualizationTitle = md.findFirstValue(ruri, 'dcterms:title');
    const CSVLayerData = {
      type: 'point',
      points: pointDataFromFile,
      title: visualizationTitle,
    };
    return CSVLayerData;
  }
  return Promise.reject(new Error('Not valid geo data'));
};

const getMapConfig = (data, layers, scaleLine) => {
  const { entry, width = '100%', height = '360px' } = data;
  const ruri = entry.getResourceURI();
  const md = entry.getAllMetadata();
  const showScaleLine = md.findFirstValue(ruri, vizNamespace.scaleLineControl) || scaleLine;
  return {
    ...data,
    width,
    height,
    layers,
    scaleLine: getBoolean(showScaleLine, false),
    hasPopup: true,
  };
};

/**
 * Renders a geographical map with base layers and vector layer from CSV content specified in entry metadata
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @param {Entry} data.entry
 * @returns {Promise<void>}
 */
export const renderMapFromCsvVisualization = async (node, data) => {
  const baseLayers = getBaseLayersData(data);
  const mapConfig = getMapConfig(data, baseLayers);
  mapConfig.mapRenderer = renderVectorLayerMap;
  const CSVLayerData = await getCSVLayerData(data.entry);
  mapConfig.layers.push(CSVLayerData);
  await renderOpenLayerMap(node, mapConfig);
};
