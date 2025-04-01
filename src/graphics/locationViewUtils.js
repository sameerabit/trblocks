import { namespaces } from '@entryscape/rdfjson';

/**
 * @typedef {object} Bounds
 * @property {'point'|'polygon'} type - Bounds type
 * @property {{east?: number, south?: number, north: number, west: number}} directions - coordinates
 */

namespaces.add('geo', 'http://www.w3.org/2003/01/geo/wgs84_pos#');

/**
 *
 * @param {string} wkt
 * @returns {Object|undefined}
 */
const getGeodataFromWkt = (wkt) => { //location
  const polygonMatches = wkt.match(/POLYGON\(\((.*)\)\)/);
  const pointMatches = wkt.match(/POINT\((.*)\)/);
  const isPoint = pointMatches?.length;
  const isPolygon = polygonMatches?.length;

  if (isPolygon) {
    const coordinates = polygonMatches[1].split(',');

    if (coordinates.length !== 5) return;

    const [west, north] = coordinates[0]
      .split(' ')
      .map((coordinate) => parseFloat(coordinate));
    const [east, south] = coordinates[2]
      .split(' ')
      .map((coordinate) => parseFloat(coordinate));

    return {
      type: 'polygon',
      coordinates: [
        { lat: north, lng: west },
        { lat: north, lng: east },
        { lat: south, lng: east },
        { lat: south, lng: west },
        { lat: north, lng: west },
      ],
    };
  }

  if (isPoint) {
    const [lng, lat] = pointMatches[1]
      .split(' ')
      .map((coordinate) => parseFloat(coordinate));

    return {
      type: 'point',
      coordinates: [{ lat, lng }],
    };
  }
};
/**
 *
 * @param {Object} geodata
 * @returns {Bounds}
 */
const getBoundsFromGeodata = ({ coordinates, type }) => { //location
  if (type === 'point') {
    const { lat: north, lng: west } = coordinates[0];
    return { type, directions: { north, west } };
  }
  const { lat: north, lng: west } = coordinates[0];
  const { lat: south, lng: east } = coordinates[2];
  return {
    type,
    directions: { north, west, south, east },
  };
};
/**
 *
 * @param {string} wkt
 * @returns {Object}
 */
const getBoundsFromWkt = (wkt) => { //location
  const geodata = getGeodataFromWkt(wkt);
  return getBoundsFromGeodata(geodata);
};
/**
 * @param binding
 * @param latitudePred
 * @param longitudePred
 * @return {{directions: {north: number, west: number}, type: string}|undefined}
 */
const getBoundsFromLatLongBinding = (binding, latitudePred, longitudePred) => {
  const value = binding.getValue();
  if (!value) {
    return undefined;
  }
  const predicate = binding.getItem()
    .getProperty();
  const graph = binding.getGraph();
  const resource = binding.getStatement()
    .getSubject();
  let north;
  let west;
  if (predicate === latitudePred) {
    north = parseFloat(value);
    west = parseFloat(graph.findFirstValue(resource, longitudePred));
  } else {
    north = parseFloat(graph.findFirstValue(resource, latitudePred));
    west = parseFloat(value);
  }
  return { type: 'point', directions: { north, west } };
};
const getBoundsFromSchemaBinding = (binding) => // location
  getBoundsFromLatLongBinding(
    binding,
    namespaces.expand('schema:latitude'),
    namespaces.expand('schema:longitude')
  );
const getBoundsFromGeoBinding = (binding) => // location
  getBoundsFromLatLongBinding(
    binding,
    namespaces.expand('geo:lat'),
    namespaces.expand('geo:long')
  );
const getBoundsFromWktBinding = (binding) => { //location
  const wkt = binding.getValue();
  if (!wkt) {
    return undefined;
  }
  return getBoundsFromWkt(wkt);
};
const detectRepresentation = (item) => { //location
  const predicate = item.getProperty();
  if (predicate?.startsWith('http://schema.org')) {
    return 'schema';
  }
  if (predicate?.startsWith('http://www.w3.org/2003/01/geo/wgs84_pos#')) {
    return 'geo';
  }
  return 'wkt';
};
/**
 * Extracts a bounds object from a binding, supports expressions using WKT literal
 * as well as the lat and long properties in geo and schema namespaces.
 *
 * @param binding
 * @return {Bounds|undefined}
 */
export const getBindingBounds = (binding) => { //location
  switch (detectRepresentation(binding.getItem())) {
    case 'schema':
      return getBoundsFromSchemaBinding(binding);
    case 'geo':
      return getBoundsFromGeoBinding(binding);
    default:
      return getBoundsFromWktBinding(binding);
  }
};