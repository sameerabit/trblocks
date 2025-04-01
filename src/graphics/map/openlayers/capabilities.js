import WMSCapabilities from 'ol/format/WMSCapabilities';
import { get as getProjection, transformExtent } from 'ol/proj';

const WEB_MERCATOR_PROJECTION = getProjection('EPSG:3857');

const knownCRS = (crs) => crs === 'EPSG:3857' || crs === 'EPSG:4326';

export const getBoundingBox = (layer) => {
  const boundingBox = layer.BoundingBox.find((bb) => knownCRS(bb.crs));
  if (layer.EX_GeographicBoundingBox) {
    return transformExtent(layer.EX_GeographicBoundingBox, 'EPSG:4326', WEB_MERCATOR_PROJECTION);
  }
  return transformExtent(boundingBox.extent, boundingBox.crs, WEB_MERCATOR_PROJECTION);
};

const extractLayers = (layers) => {
  if (!layers.Layer) {
    return Array.isArray(layers) ? layers : [layers];
  }
  const allLayers = [];
  if (Array.isArray(layers.Layer)) {
    layers.Layer.forEach((row) => {
      allLayers.push(...extractLayers(row));
    });
  } else {
    allLayers.push(...extractLayers(layers.Layer));
  }
  return allLayers;
};

export const extractFromCapabilities = (struct) => {
  const Layers = extractLayers(struct.Capability.Layer);

  return Layers.map((layer) => ({
    name: layer.Name,
    title: layer.Title,
    boundingbox: getBoundingBox(layer),
  }));
};

export const getCapabilities = (url) => fetch(url).then((response) => response.text());

export const betterURL = (struct) =>
  struct?.Capability?.Request?.GetMap?.DCPType?.find((item) => !!item?.HTTP?.Get?.OnlineResource)?.HTTP?.Get
    ?.OnlineResource;

const getLayersFromCapabilities = (capabilities, capabilitiesUrl) => {
  const wmsParser = new WMSCapabilities();
  const wmsStruct = wmsParser.read(capabilities);
  const layers = extractFromCapabilities(wmsStruct).reverse();
  const layerSourceUrl = betterURL(wmsStruct) || capabilitiesUrl;
  const extent = layers[0].boundingbox;
  return { layerSourceUrl, layers, extent };
};

export const getLayersConfigFormCapabilities = async (capabilitiesUrl) => {
  const capabilities = await getCapabilities(capabilitiesUrl);
  const { layerSourceUrl, layers, extent } = getLayersFromCapabilities(capabilities, capabilitiesUrl);
  return layers.map((layer) => ({
    type: 'wms',
    name: layer.name,
    title: layer.title || layer.name,
    boundingBox: layer.boundingbox,
    extent,
    url: layerSourceUrl,
  }));
};
