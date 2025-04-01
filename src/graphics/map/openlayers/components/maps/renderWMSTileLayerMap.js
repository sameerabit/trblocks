import { getCenter } from 'ol/extent';
import LayerLegend from 'blocks/graphics/map/openlayers/components/controls/ol-layerlegend';
import { Attribution, defaults, ScaleLine } from 'ol/control';
import OLMap from 'ol/Map';
import View from 'ol/View';
import LayerSwitcher from 'ol-layerswitcher';
import { setAreaAttributes } from 'blocks/graphics/map/openlayers/components/maps/setAreaAttributes';

/**
 * Initiate the openlayers map
 *
 * @param {HTMLElement} node
 * @param {HTMLElement} controlLayer
 * @param {object} data
 * @param {number} data.maxzoom
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
      maxZoom: data.maxzoom || 18,
      zoom: data.zoom || 8,
    }),
    controls: defaults({ attribution: false }).extend([attribution]),
  });
  return olMap;
};

/**
 * Renders a map with base layers and WMS layers
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @param {Array<number>} data.extent
 * @param {boolean} data.legend
 * @param {string} data.legendButtonText
 * @param {string} data.noLegendText
 * @param {boolean} data.layerSwitcher
 * @param {boolean} data.scaleLine
 * @param {number} [data.zoom]
 * @param {Array<object>} olLayersArr
 * @returns {void}
 */
const renderWMSTileLayerMap = (node, data, olLayersArr) => {
  const controlLayer = document.createElement('div');
  controlLayer.classList.add('olEsbControls--absolute');
  const olMap = initMap(node, controlLayer, data, olLayersArr);
  if (!data.extent) {
    data.extent = olLayersArr[olLayersArr.length - 1].getExtent();
  }
  const olMapView = olMap.getView();
  olMapView.setCenter(getCenter(data.extent));
  olMapView.fit(data.extent);
  if (data.zoom) {
    olMapView.setZoom(data.zoom);
  }
  if (data.legend) {
    const layerLegend = new LayerLegend({
      legendButtonText: data.legendButtonText || 'Legend',
      noLegendText: data.noLegendText || 'No legend to display',
    });
    olMap.addControl(layerLegend);
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
export default renderWMSTileLayerMap;
