import registry from 'blocks/registry';
import jquery from 'jquery';
import renderOpenLayerMap from 'blocks/graphics/map/renderOpenLayerMap';
import { getPopupContentFromTemplate } from 'blocks/graphics/util';
import renderVectorLayerMap from 'blocks/graphics/map/openlayers/components/maps/renderVectorLayerMap';

const NOMINATIM_BASE_QUERY = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&json_callback=?';
const MAPTILER_TEMPLATE_QUERY =
  'https://api.maptiler.com/geocoding/{query}.json?limit=1&country=se&fuzzyMatch=false&key={key}';

/**
 * Tries to find the address entry
 *
 * @param {Entry} entry
 * @returns {Promise<Entry>}
 */
const getAddressEntry = async (entry) => {
  const md = entry.getAllMetadata();
  const ruri = entry.getResourceURI();
  const addressResourceURI = md.findFirstValue(ruri, 'schema:address');
  return registry.getEntryStoreUtil().getEntryByResourceURI(addressResourceURI);
};

/**
 * Tries to find address property values
 *
 * @param {Entry} addressEntry
 * @returns {{streetAddress: string, addressLocality: (*|string), addressRegion: (*|string)}|undefined}
 */
const getAddressValues = (addressEntry) => {
  if (!addressEntry) return;
  const addressMetaData = addressEntry.getAllMetadata();
  const addressResourceURI = addressEntry.getResourceURI();
  let streetAddress = addressMetaData.findFirstValue(addressResourceURI, 'schema:streetAddress') || '';
  streetAddress = streetAddress.split(',')[0].trim();
  const addressLocality = addressMetaData.findFirstValue(addressResourceURI, 'schema:addressLocality') || '';
  const addressRegion = addressMetaData.findFirstValue(addressResourceURI, 'schema:addressRegion') || '';
  return { streetAddress, addressLocality, addressRegion };
};

const getNominatimLongLatFromAddress = async (addressesObject) => {
  const { streetAddress, addressLocality, addressRegion } = addressesObject;
  // Requests to be made, from last to first.
  const findAddress = async (reqs) => {
    let longLat = [];
    await jquery.getJSON(reqs.pop(), (response) => {
      if (response && response.length > 0) {
        longLat = [response[0].lon, response[0].lat];
        return;
      }
      if (reqs.length > 0) {
        return findAddress(reqs);
      }
    });
    return longLat;
  };
  const reqs = [
    `${NOMINATIM_BASE_QUERY}&street=${streetAddress}`,
    `${NOMINATIM_BASE_QUERY}&street=${streetAddress}&city=${addressLocality}`,
    `${NOMINATIM_BASE_QUERY}&street=${streetAddress}&county=${addressRegion}`,
    `${NOMINATIM_BASE_QUERY}&q=${streetAddress}, ${addressLocality}, ${addressRegion}`,
  ];
  return findAddress(reqs);
};
const getMaptilerLongLatFromAddress = async (addressesObject, maptilerKey) => {
  const { streetAddress, addressLocality, addressRegion } = addressesObject;
  // Requests to be made, from last to first.
  const findAddress = async (requests) => {
    if (requests.length < 1) return;
    const requestsArray = requests;
    try {
      const longLatArray = await fetch(requestsArray.pop())
        .then((response) => response.json())
        .then((featureCollection) => {
          const featureGeoJSONs = featureCollection.features;
          if (!featureGeoJSONs || featureGeoJSONs[0]?.geometry?.type !== 'Point') {
            return findAddress(requestsArray);
          }
          return [featureGeoJSONs[0].geometry.coordinates[0], featureGeoJSONs[0].geometry.coordinates[1]];
        });
      return longLatArray;
    } catch (error) {
      console.log('Error: ', error);
    }
  };
  const querys = [
    streetAddress,
    `${encodeURIComponent(streetAddress)}, ${encodeURIComponent(addressLocality)}`,
    `${encodeURIComponent(streetAddress)}, ${encodeURIComponent(addressRegion)}`,
    `${encodeURIComponent(streetAddress)}, ${encodeURIComponent(addressLocality)}, ${encodeURIComponent(
      addressRegion
    )}`,
  ];
  const requests = querys.map((query) =>
    MAPTILER_TEMPLATE_QUERY.replace('{query}', query).replace('{key}', maptilerKey)
  );
  const longLat = await findAddress(requests);
  return longLat;
};

const getLongLatFromAddress = async (addressObject, maptilerKey) => {
  if (maptilerKey) {
    return getMaptilerLongLatFromAddress(addressObject, maptilerKey);
  }
  return getNominatimLongLatFromAddress(addressObject);
};

/**
 * Creates config object for vector layer from entry address metadata and via request to external service
 * to get coordinates
 *
 * @param {object} data
 * @param {Entry} data.entry
 * @param {Array<object>} data.layers
 * @param {string} [data.maptilerKey] - to use maptiler a key is needed
 * @param {string} [data.popup] - handlebars template
 * @returns {Promise<object>} - completed config (data) object
 */
const getMapConfig = async (data) => {
  const addressEntry = await getAddressEntry(data.entry);
  const addressesObject = getAddressValues(addressEntry);
  const lonLatCoordinates = await getLongLatFromAddress(addressesObject, data.maptilerKey);
  const featureInfoData = {};
  if (lonLatCoordinates) {
    if (data.popup) {
      featureInfoData.popupContent = getPopupContentFromTemplate(data);
    }
    const layers = [
      ...data.layers,
      {
        type: 'point',
        points: [{ lonLatCoordinates, featureInfoData }],
      },
    ];
    return { ...data, layers };
  }
};

/**
 * Renders a geographical map with baselayers and vector layer from entry metadata address fields using Maptiler
 * or fallback to Nominatim
 *
 * @param {HTMLElement} node
 * @param {object} data
 * @returns {Promise<void>}
 */
export const renderMapFromAddress = async (node, data) => {
  const mapConfig = await getMapConfig(data);
  mapConfig.mapRenderer = renderVectorLayerMap;
  await renderOpenLayerMap(node, mapConfig);
};
