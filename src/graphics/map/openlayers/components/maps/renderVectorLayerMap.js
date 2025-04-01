import { Attribution, defaults, ScaleLine } from 'ol/control';
import OLMap from 'ol/Map';
import View from 'ol/View';
import { addPopupOverlay } from 'blocks/graphics/map/openlayers/popover';
import LayerSwitcher from 'ol-layerswitcher';
import VectorSource from 'ol/source/Vector';
import { setAreaAttributes } from 'blocks/graphics/map/openlayers/components/maps/setAreaAttributes';

/**
 * Initiate the openlayers map
 *
 * @param {HTMLElement} node
 * @param {HTMLElement} controlLayer
 * @param {object} data
 * @param {number} data.zoom
 * @param {Array<object>} olLayersArr
 * @returns {OLMap}
 */
const initMap = (node, controlLayer, data, olLayersArr) => {
  const attribution = new Attribution({
    collapsed: false,
    collapsible: false,
    className: 'olEsbAttribution ol-attribution',
    target: controlLayer,
  });
  const olMap = new OLMap({
    layers: olLayersArr,
    target: node,
    view: new View({
      maxZoom: 18,
      zoom: data.zoom || 8,
    }),
    controls: defaults({ attribution: false }).extend([attribution]),
  });
  return olMap;
};

/**
 * zooms to a vectorlayer leaving room for padding
 *
 * @param {OLMap} olMap
 * @param {object} data
 * @param {number} data.maxzoom
 * @param {number} data.zoom
 * @param {VectorLayer} vectorLayer
 */
const zoomToLayer = (olMap, data, vectorLayer) => {
  const vectorLayerSource = vectorLayer.getSource();
  const hasVectorLayer = vectorLayerSource instanceof VectorSource;
  if (!hasVectorLayer) {
    olMap.getView().setCenter([0, 0]);
    olMap.getView().setZoom(0);
    return;
  }
  const layerExtent = vectorLayerSource.getExtent();
  if (layerExtent.filter(Number.isFinite).length !== 4) return; // handle infinity
  olMap.getView().fit(layerExtent, {
    padding: [50, 50, 50, 50],
    maxZoom: data.maxzoom,
  });
  if (data.zoom) {
    olMap.getView().setZoom(data.zoom);
  }
};

/**
 * Renders a map with base layers and a vector layer zoomed to given level or maxZoom on extent
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @param {boolean} data.hasPopup
 * @param {boolean} data.layerSwitcher
 * @param {boolean} data.scaleLine
 * @param {string} data.mapId
 * @param {string} [data.rowId]
 * @param {string} [data.label]
 * @param {Array<VectorLayer|TileLayer>} olLayersArr
 * @returns {void}
 */
const renderVectorLayerMap = (node, data, olLayersArr) => {
  const controlLayer = document.createElement('div');
  controlLayer.classList.add('olEsbControls--absolute');
  const olMap = initMap(node, controlLayer, data, olLayersArr);
  const vectorLayer = olLayersArr[olLayersArr.length - 1];
  zoomToLayer(olMap, data, vectorLayer);
  if (data.hasPopup) {
    addPopupOverlay(olMap);
  }
  if (data.layerSwitcher) {
    const layerSwitcher = new LayerSwitcher({
      tipLabel: 'Legend', // Optional label for button
      groupSelectStyle: 'group', // Can be 'children' [default], 'group' or 'none'
    });
    olMap.addControl(layerSwitcher);
  }
  if (data.scaleLine) {
    const scaleLine = new ScaleLine({
      name: 'scale-line',
      className: 'olEsbScaleLine ol-scale-line',
      target: controlLayer,
    });
    olMap.addControl(scaleLine);
  }
  node.appendChild(controlLayer);

  if (data.label) {
    olMap.once('postrender', (e) => {
      setAreaAttributes(data, olMap);
    });
  }
};
export default renderVectorLayerMap;
