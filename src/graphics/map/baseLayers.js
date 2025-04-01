import registry from 'blocks/registry';

const getLayerType = (url) => {
  const isOSM = /openstreetmap\.org/;
  const isXYZ = /{[xyz]}\/{[xyz]}\/{[xyz]}/;
  if (isOSM.test(url)) return 'osm';
  if (isXYZ.test(url)) return 'xyz';
  return 'unknown';
};

/**
 * Completes and translates from old map block config
 *
 * @param {object} data
 * @param {string} [data.title]
 * @param {string} [data.tilename]
 * @param {string} [data.name]
 * @param {string} [data.capabilities]
 * @param {Array<object>} [data.layer]
 * @param {string} [data.attribution]
 * @param {string} [data.attributions]
 * @param {string} [data.maxzoom]
 * @param {string} [data.url]
 * @param {string} [data.tilelayer]
 * @param {string} [data.type]
 * @param {boolean} [data.base]
 * @returns {{ fetchFromCapabilities: boolean, maxzoom: (number|number), name: (*|string), type: string, title: *, url: *, attributions: (*|undefined), layer, base: boolean}}
 */
const getLayerData = (data) => {
  const {
    title,
    tilename,
    name,
    capabilities,
    matrixSet,
    layer,
    attribution,
    attributions,
    maxzoom,
    url,
    tilelayer,
    type,
    base,
  } = data;
  const layerUrl = url || tilelayer || undefined;
  const layerType = type || getLayerType(layerUrl);
  return {
    type: layerType,
    url: layerUrl,
    title: title || tilename || name,
    name: name || tilename || '',
    maxzoom: parseInt(maxzoom, 10) || 18,
    attributions: attributions || attribution || undefined,
    base: base || true,
    matrixSet,
    layer,
  };
};

/**
 * Creates an array of base layer config data from available sources
 *
 * @param {object} data
 * @param {Array<object>} [data.layers]
 * @param {string} [data.url]
 * @param {string} [data.tilelayer]
 * @param {object} data.baseMap?
 * @returns {[{maxzoom: number, type: string, base: boolean}]|{matrixSet, fetchFromCapabilities: boolean, capabilities, maxzoom: (number|number), name: (*|string), type: string, title: *, url: *, attributions: (*|undefined), layer, base: boolean}[]|*[]}
 */
export const getBaseLayersData = (data) => {
  if (data.layers) {
    const fixedLayersArray = [];
    data.layers.forEach((layer) => {
      fixedLayersArray.push(getLayerData(layer));
    });
    return fixedLayersArray.reverse();
  }
  if (data.url || data.tilelayer) {
    return [getLayerData(data)];
  }
  if (data.baseMap) {
    return [getLayerData(data.baseMap)];
  }
  const baseMap = registry.get('base_map');
  if (baseMap) {
    return [getLayerData(baseMap)];
  }
  return [{ type: 'osm', maxzoom: 18, base: true }];
};
