import 'ol/ol.css';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import DOMUtil from 'blocks/utils/htmlUtil';
import handlebars from 'blocks/boot/handlebars';
import { getOlLayersArray } from 'blocks/graphics/map/openlayers/layers';

const renderLoader = (node, data) => {
  if (!data.loading) return;
  const loader = DOMUtil.create('div', { class: 'esbLoaderHandle' }, node);
  handlebars.run(loader, data, data.loading, null, false);
  return loader;
};

let mapNumber = 0;

export default async (node, data) => {
  data.mapId = `map-${mapNumber}`;
  mapNumber += 1;
  const loaderElement = renderLoader(node, data);
  const { mapRenderer, layers: layersDataArray } = data;
  const olLayersArray = await getOlLayersArray(layersDataArray);
  mapRenderer(node, data, olLayersArray);
  if (loaderElement) {
    loaderElement.remove();
  }
};
