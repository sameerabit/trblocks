import { namespaces } from '@entryscape/rdfjson';

const isRange = (constraintValue) => {
  const rangeRegEx = /\[.+\sTO\s.+]/;
  return rangeRegEx.test(constraintValue);
};

const getRangeLimits = (constraintValue) => {
  const fromTo = constraintValue.match(/\[(.+)\sTO\s(.+)]/, constraintValue);
  if (fromTo.length !== 3) {
    console.error(`Failed creating range query from ${constraintValue}`);
    return {};
  }
  return { from: fromTo[1], to: fromTo[2] };
};

/**
 * Adds the struct to the query object with AND
 *
 * @param {object} structure
 * @param {string|Array} structure.rdfType
 * @param {object} structure.and
 * @param {object} structure.or
 * @param {SolrQuery} queryObject
 */
const updateQueryWithStructure = ({ rdfType = null, and = null, or = null }, queryObject) => {
  if (rdfType) {
    queryObject.rdfType(rdfType);
  }
  if (and) {
    queryObject.and(and);
  }
  if (or) {
    queryObject.or(or);
  }
};

export default function (obj, constraints) {
  if (constraints) {
    Object.keys(constraints).forEach((_key) => {
      const modifier = _key.startsWith('~'); // true means not.
      const key = modifier ? _key.substring(1) : _key;
      const val = constraints[_key];
      if (namespaces.expand(key) === namespaces.expand('rdf:type')) {
        obj.rdfType(val, modifier);
      } else if (key === 'uri') {
        obj.uri(val, modifier);
      } else if (key === 'resource') {
        obj.resource(val, modifier);
      } else if (key === 'and' || key === 'query') {
        updateQueryWithStructure(val, obj);
      } else if (typeof val === 'string') {
        if (val[0] === '<') {
          obj.uriProperty(key, val.slice(1, val.length - 1), modifier);
        } else if (isRange(val)) {
          const { from, to } = getRangeLimits(val);
          obj.literalPropertyRange(key, from, to, modifier);
        } else {
          obj.literalProperty(key, val, modifier, 'string');
        }
      } else if (Array.isArray(val)) {
        if (val[0][0] === '<') {
          obj.uriProperty(
            key,
            val.map((uri) => uri.slice(1, uri.length - 1)),
            modifier
          );
        } else if (isRange(val)) {
          const { from, to } = getRangeLimits(val);
          obj.literalPropertyRange(key, from, to, modifier);
        } else {
          obj.literalProperty(key, val, modifier, 'string');
        }
      }
    });
  }
  return obj;
}
