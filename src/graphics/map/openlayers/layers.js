import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import { svgMarker } from 'blocks/graphics/svgMarker';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import Polygon from 'ol/geom/Polygon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import { getLayersConfigFormCapabilities } from 'blocks/graphics/map/openlayers/capabilities';

/**
 * @param {object} layerConfig
 * @returns {TileLayer}
 */
export const createOSMLayer = (layerConfig) => {
  return new TileLayer({
    source: new OSM(),
    maxZoom: layerConfig.maxzoom,
    title: 'Open Street Map',
    type: layerConfig.base ? 'base' : undefined,
  });
};

/**
 * @param {object} layerConfig
 * @returns {VectorLayer}
 */
export const createPointVectorLayer = (layerConfig) => {
  const features = [];
  layerConfig.points.forEach((point) => {
    const webMercatorXYArray = point.webMercatorXYCoordinates || fromLonLat(point.lonLatCoordinates);
    features.push(
      new Feature({
        geometry: new Point(webMercatorXYArray),
        properties: point.featureInfoData,
      })
    );
  });
  return new VectorLayer({
    source: new VectorSource({ features }),
    style: new Style({
      image: new Icon({
        anchor: [0.5, 32],
        anchorYUnits: 'pixels',
        src: svgMarker(),
      }),
    }),
  });
};

/**
 * @param {object} layerConfig
 * @returns {VectorLayer}
 */
export const createPolygonVectorLayer = (layerConfig) => {
  const webMercatorXYPolygonArray = [];
  layerConfig.lonLatCoordinates.forEach((coordinatePair) => {
    webMercatorXYPolygonArray.push(fromLonLat(coordinatePair));
  });
  const linearRingsArray = [webMercatorXYPolygonArray];
  const features = [
    new Feature({
      geometry: new Polygon(linearRingsArray),
    }),
  ];
  return new VectorLayer({
    source: new VectorSource({ features, wrapX: false }),
    style: new Style({
      fill: new Fill({
        color: 'rgba(51, 136, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgb(51, 136, 255)',
        width: 3,
      }),
    }),
  });
};

/**
 * @param {object} layerConfig
 * @param {string} layerConfig.title
 * @param {boolean} layerConfig.base
 * @param {number} layerConfig.maxZoom
 * @param {string} layerConfig.url
 * @param {string} layerConfig.attributions
 * @returns {TileLayer}
 */
export const createXYZLayer = ({ title, base, maxZoom, url, attributions }) => {
  return new TileLayer({
    title,
    type: base ? 'base' : undefined,
    maxZoom,
    source: new XYZ({
      url,
      attributions,
    }),
  });
};

/**
 * @param {object} layerConfig
 * @param {string} layerConfig.name
 * @param {string} layerConfig.title
 * @param {string} layerConfig.base
 * @param {string} layerConfig.url
 * @param {string} layerConfig.attributions
 * @param {Array<number>} layerConfig.extent
 * @param {Array<number>} layerConfig.boundingBox
 * @param {boolean} layerConfig.visible
 * @returns {TileLayer}
 */
export const createWMSLayer = ({ name, title, base, url, extent, boundingBox, attributions, visible = true }) => {
  return new TileLayer({
    extent,
    boundingBox,
    title: title || name,
    name,
    visible,
    type: base ? 'base' : undefined,
    source: new TileWMS({
      url,
      params: {
        LAYERS: name,
        TILED: true,
      },
      transition: 0,
      attributions,
    }),
  });
};
const getOlLayer = async (layer) => {
  const olLayersArray = [];
  if (layer.fetchFromCapabilities) {
    const layersConfig = await getLayersConfigFormCapabilities(layer.capabilitiesUrl);
    layersConfig.forEach((layerConfig) => {
      olLayersArray.push(createWMSLayer(layerConfig));
    });
    return olLayersArray;
  }
  switch (layer.type) {
    case 'osm':
      olLayersArray.push(createOSMLayer(layer));
      break;
    case 'wms':
      olLayersArray.push(createWMSLayer(layer));
      break;
    case 'xyz':
      olLayersArray.push(createXYZLayer(layer));
      break;
    case 'point':
      olLayersArray.push(createPointVectorLayer(layer));
      break;
    case 'polygon':
      olLayersArray.push(createPolygonVectorLayer(layer));
      break;
    default:
      throw new Error(`Error: layer.type: ${layer.type} not supported`);
  }
  return olLayersArray;
};

/**
 * @param {Array<object>} layers
 * @returns {Promise<(VectorLayer|TileLayer)[]>}
 */
export const getOlLayersArray = async (layers) => {
  const tempArray = [];
  layers.forEach((layer) => {
    tempArray.push(getOlLayer(layer));
  });
  const promises = await Promise.all(tempArray);
  const olLayersArray = [];
  promises.forEach((promise) => {
    olLayersArray.push(...promise);
  });
  return olLayersArray;
};
