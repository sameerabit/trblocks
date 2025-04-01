import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import mapValues from 'lodash-es/mapValues';
import { getBoolean } from 'blocks/utils/configUtil';

const numberToSetting = (settingNumber) => {
  switch (settingNumber) {
    case 3:
      return { type: 'term*' };
    case 2:
      return { type: 'term+' };
    case 1:
    default:
      return { type: 'term' };
  }
};

const stringToSetting = (settingString) => {
  const cleanedSettingString = settingString.replace(/\^/, '');
  return {
    type: settingString.split(',')[0],
    boost: cleanedSettingString.split(',')[1] || '',
  };
};

const defaultSettings = ({ type, boost = '', escapeWhitespace, includes = null, excludes = null }) => ({
  type,
  boost: boost === '' ? boost : `^${boost}`,
  escapeWhitespace: getBoolean(escapeWhitespace, false),
  includes,
  excludes,
});

/**
 * Create a query settings object from string, number templates and incomplete template objects
 *
 * @param {{'string': object|number|string}} queryTemplate
 * @returns {{'string': {type: 'string', boost: 'string', includes: null|'string', excludes: null|'string'}}|undefined}
 */
const getNormalizedQueryTemplateObject = (queryTemplate) => {
  if (queryTemplate === null || typeof queryTemplate !== 'object') {
    return;
  }
  const queryTemplateObject = {};
  Object.keys(queryTemplate).forEach((searchParameter) => {
    const querySetting = queryTemplate[searchParameter];
    if (typeof querySetting === 'object' && querySetting !== null) {
      queryTemplateObject[searchParameter] = defaultSettings(querySetting);
      return;
    }
    if (typeof querySetting === 'number') {
      const settingFromNumber = numberToSetting(querySetting);
      queryTemplateObject[searchParameter] = defaultSettings(settingFromNumber);
      return;
    }
    if (typeof querySetting === 'string') {
      const settingFromString = stringToSetting(querySetting);
      queryTemplateObject[searchParameter] = defaultSettings(settingFromString);
    }
  });
  return queryTemplateObject;
};

/**
 * Checks the includes and excludes regExp against the search string and returns a new object with
 * queryTemplates that should be included in the query based on the result.
 *
 * @param {{'string': {type: 'string', boost: 'string', includes: null|'string', excludes: null|'string'}}} queryTemplateObject
 * @param {string} searchTerm
 * @returns {{'string': {type: 'string', boost: 'string', includes: null|'string', excludes: null|'string'}}}
 */
const filterQueryTemplate = (queryTemplateObject, searchTerm) => {
  const matchedQueryTemplate = {};
  Object.keys(queryTemplateObject).forEach((searchParameter) => {
    const querySetting = queryTemplateObject[searchParameter];
    if (querySetting.includes) {
      const queryRegexp = new RegExp(querySetting.includes);
      if (!queryRegexp.test(searchTerm)) return;
    }
    if (querySetting.excludes) {
      const queryRegexp = new RegExp(querySetting.excludes);
      if (queryRegexp.test(searchTerm)) return;
    }
    matchedQueryTemplate[searchParameter] = querySetting;
  });
  return matchedQueryTemplate;
};

/**
 * Escapes whitespace when searching for metadata.predicate.literal_s or if specifically stated
 *
 * @param {string} searchParameter - parameter to find matching value for
 * @param {string} type - type of search (term, term* etc.)
 * @param {boolean} escapeWhitespaceConfig
 * @returns {boolean}
 */
const getShouldEscapeWhitespace = (searchParameter, type, escapeWhitespaceConfig) => {
  if (escapeWhitespaceConfig) return escapeWhitespaceConfig;
  const isStringLiteral = searchParameter.includes('metadata.predicate.literal_s');
  const isWildcardType = type.includes('*') || type.includes('+');
  return isStringLiteral && isWildcardType;
};

/**
 * Remove * at the end of a search term and lowercase term when using literal_s
 *
 * @param {string} term - What to search for
 * @param {string} searchParameter - Parameter in solar index
 * @param {string} type - type of search (term, term* etc.)
 * @param {boolean} escapeWhitespaceConfig
 * @returns {string}
 */
const getCleanSearchTerm = (term, searchParameter, type, escapeWhitespaceConfig) => {
  const escapeWhitespace = getShouldEscapeWhitespace(searchParameter, type, escapeWhitespaceConfig);
  let cleanedTerm = term.replace(/\*$/, '');
  cleanedTerm = escapeWhitespace ? cleanedTerm.replace(' ', '\\ ') : cleanedTerm;
  cleanedTerm = searchParameter.includes('literal_s') ? cleanedTerm : cleanedTerm.toLowerCase();
  return cleanedTerm;
};

/**
 * Returns the correctly formatted search pattern
 * @param {string} searchTerm
 * @param {string} type
 * @param {number} boost
 * @return {string[]|string}
 */
function getQuerySearchPattern(searchTerm, type, boost) {
  if (searchTerm.length === 0) {
    return '*';
  }
  switch (type) {
    case '*term':
      return [`*${searchTerm}${boost}`, `${searchTerm}${boost}`];
    case 'term*':
      return [`${searchTerm}*${boost}`, `${searchTerm}${boost}`];
    case '*term*':
      return [
        `*${searchTerm}${boost}`,
        `${searchTerm}*${boost}`,
        `*${searchTerm}*${boost}`,
        `${searchTerm}${boost}`,
      ];
    case 'term+':
      return `${searchTerm}*${boost}`;
    case '+term':
      return `*${searchTerm}${boost}`;
    case '+term+':
      return `*${searchTerm}*${boost}`;
    case 'term':
    default:
      return `${searchTerm}${boost}`;
  }
}

/**
 * @param {SolrQuery} qo
 * @param {Array<string>|string} terms
 */
export const termsConstraint = (qo, terms) => {
  if (terms != null && terms.length > 0) {
    const queryTemplate = registry.get('blocks_query') || {
      title: 1,
      description: 1,
      'tag.literal': 1,
    };
    const queryTemplateObject = getNormalizedQueryTemplateObject(queryTemplate);
    if (!queryTemplateObject) {
      console.error('global query parameter not correctly declared in config');
      return;
    }
    (Array.isArray(terms) ? terms : [terms]).forEach((term) => {
      const filteredQueryTemplateObject = filterQueryTemplate(queryTemplateObject, term);
      qo.or(
        mapValues(filteredQueryTemplateObject, (val, searchParameter) => {
          const { type, boost, escapeWhitespace: escapeWhitespaceConfig } = val;
          const searchTerm = getCleanSearchTerm(term, searchParameter, type, escapeWhitespaceConfig);
          return getQuerySearchPattern(searchTerm, type, boost);
        })
      );
    });
  } else {
    const emptyQuery = registry.get('blocks_empty_query');
    if (emptyQuery) {
      qo.or(emptyQuery);
    }
  }
};

export const facetSearchQuery = (term, data, collection) => {
  const es = registry.get('entrystore');
  const qo = es.newSolrQuery();
  if (registry.get('blocks_forcePublicRequests') !== false) {
    qo.publicRead();
  }

  const urlParams = params.getUrlParams();
  const context = collection.context || (data.context === true ? urlParams.context : data.context);
  if (context) {
    qo.context(context);
  }
  if (collection.rdftype) {
    qo.rdfType(collection.rdftype);
  }
  if (collection.searchproperty) {
    if (!term.length) {
      qo.literalProperty(collection.searchproperty, '*');
    } else {
      qo.literalProperty(
        collection.searchproperty,
        [term, `${term}*`],
        undefined,
        collection.searchIndextype,
        collection.related
      );
    }
  } else if (!term.length) {
    qo.title('*');
  } else if (term.length < 3) {
    qo.title(`${term}*`);
  } else {
    qo.title(term);
  }
  return qo;
};

export const cloneWithoutFacets = (query) => { // TODO! - Rename to something else and remove limit sort
  const es = registry.get('entrystore');
  const qo = es.newSolrQuery();
  try {
    qo.properties = JSON.parse(JSON.stringify(query.properties));
    qo.relatedProperties = JSON.parse(JSON.stringify(query.relatedProperties));
    qo.params = new Map(JSON.parse(JSON.stringify([...query.params])));
    qo.modifiers = new Map(JSON.parse(JSON.stringify([...query.modifiers])));
    qo._and = new Set(JSON.parse(JSON.stringify([...query._and])));
    qo._or = new Set(JSON.parse(JSON.stringify([...query._or])));
    qo._sort = JSON.parse(JSON.stringify(query._sort));
    qo._limit = JSON.parse(JSON.stringify(query._limit));
  } catch (e) {
    console.log(`Failed cloning a query due to: ${e}`);
  }
  return qo;
};
