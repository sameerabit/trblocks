import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import renderVectorLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderVectorLayerMap';
import { getBindingBounds } from 'blocks/graphics/locationViewUtils';
import { getBaseLayersData } from 'blocks/graphics/map/baseLayers';

const getVectorLayerConfig = (binding) => {
  const { type, directions } = getBindingBounds(binding);
  if (type === 'point') {
    return {
      type,
      points: [{ lonLatCoordinates: [directions.west, directions.north] }],
    };
  }
  if (type === 'polygon') {
    return {
      type,
      lonLatCoordinates: [
        [directions.west, directions.north],
        [directions.east, directions.north],
        [directions.east, directions.south],
        [directions.west, directions.south],
        [directions.west, directions.north],
      ],
    };
  }
};

const getMapConfig = (binding, bundle) => {
  const baseLayers = getBaseLayersData({});
  const label = `${bundle.geoLocationMap} ${binding.getItem().getLabel()}`;
  const layers = [...baseLayers, getVectorLayerConfig(binding)];
  return { class: 'escoMap', width: '100%', height: '300px', maxzoom: '15', layerSwitcher: false, layers, label };
};

const locationMapView = (node, binding, bundle) => {
  const mapConfig = getMapConfig(binding, bundle);
  mapConfig.mapRenderer = renderVectorLayerMap;
  renderOpenLayerMap(node, mapConfig);
};

export default locationMapView;
