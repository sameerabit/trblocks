import registry from 'blocks/registry';
import { namespaces } from '@entryscape/rdfjson';
import { SolrQuery } from '@entryscape/entrystore-js';

const includeInFacetQueries = (type) => {
  return type !== 'radio' && type !== 'checkbox';
};

export default class FacetStore {
  /**
   * Handles values for facets
   *
   * @param {Array<object>} collections
   */
  constructor(collections) {
    this.facetsArray = collections.filter(({ type }) => includeInFacetQueries(type));
    this.generalFacetConfig = {};
  }

  /**
   * Modifies the SolrQuery with facets
   *
   * @param {SolrQuery} searchListSolrQuery
   * @param {Array<object>} facetsArray
   * @returns {void}
   */
  _addFacetFields2Query = (searchListSolrQuery, facetsArray) => {
    facetsArray.forEach((facet) => {
      if (facet.property) {
        switch (facet.nodetype) {
          case 'integer':
            searchListSolrQuery.integerFacet(facet.property, facet.related);
            break;
          case 'literal':
            searchListSolrQuery.literalFacet(facet.property, facet.related);
            break;
          default:
            if (!facet.related && namespaces.expand(facet.property) === namespaces.expand('rdf:type')) {
              searchListSolrQuery.facet('rdfType', 'rdf:type');
            } else {
              searchListSolrQuery.uriFacet(facet.property, facet.related);
            }
        }
      }
    });
  };

  /**
   * Modifies the SolrQuery with global level parameters for facets
   *
   * @param {SolrQuery} searchListSolrQuery
   * @returns {void}
   */
  _addFacetMode2Query(searchListSolrQuery) {
    Object.entries(this.generalFacetConfig).forEach(([configName, configValue]) => {
      switch (configName) {
        case 'facetLimit':
          searchListSolrQuery.facetLimit(configValue);
          break;
        case 'facetMinCount':
          searchListSolrQuery.facetMinCount(configValue);
          break;
        case 'facetMissing':
          searchListSolrQuery.facetMissing(configValue);
          break;
        default:
      }
    });
  }

  /**
   * Checks if the filter includes the facet
   *
   * @param {object} facet
   * @returns {boolean}
   */
  _isActiveMultiSelectFacet = (facet) => {
    const activeFilters = registry.get('blocks_search_filter') || {};
    return !!(facet.multiSelect && Object.keys(activeFilters).includes(facet.name));
  };

  /**
   * Fetch facets for multiSelect requires making new queries with empty group filter
   *
   * @param {object} facet
   * @param {ArrayList} list
   * @return {Promise<Array>}
   * @private
   */
  async _getFacetResult(facet, list) {
    const oldQuery = list.getQuery();
    const newQuery = this._getStripedQuery(oldQuery, facet.property);
    newQuery.limit(0);
    this.addFacetParameters2Query(newQuery, [facet]);
    const newFacetList = newQuery.list();
    try {
      await newFacetList.getEntries();
      const facets = newFacetList.getFacets();
      return facets;
    } catch (error) {
      console.error('Failed fetching multiFacet results due to: ', error);
    }
  }

  /**
   * Handle making all requests for multiFacet results and return result when reddy
   *
   * @param {Array<object>} activeMultiSelectFacets
   * @param {ArrayList} list
   * @returns {Promise<Array>}
   * @private
   */
  async _getMultiFacetValuesArray(activeMultiSelectFacets, list) {
    const facetCallArray = [];
    activeMultiSelectFacets.forEach((facet) => {
      facetCallArray.push(this._getFacetResult(facet, list));
    });
    const facetValueArray = await Promise.all(facetCallArray);
    const multiFacetValueArray = [];
    facetValueArray.forEach((promise) => {
      multiFacetValueArray.push(...promise);
    });
    return multiFacetValueArray;
  }

  /**
   * Add new values in place of the ones from the searchList
   *
   * @param {Array<object>} facetValuesArray - Facet array to operate on
   * @param {Array<object>} multiFacetValuesArray - Facet array with values to replace
   * @returns {void}
   * @private
   */
  _replaceFacetsWithMultiFacetsValues = (facetValuesArray, multiFacetValuesArray) => {
    multiFacetValuesArray.forEach((multiFacetResult) => {
      const indexToReplace = facetValuesArray.findIndex((facetResult) => facetResult.name === multiFacetResult.name);
      facetValuesArray[indexToReplace] = multiFacetResult;
    });
  };

  /**
   * Returns the facetValues from the list together with added multiselect facet results
   *
   * @param {ArrayList} list
   * @returns {Promise<Array|*[]>}
   */
  async _getFacetValuesArray(list) {
    const facetValuesArray = list.getFacets() || [];
    const activeMultiSelectFacets = this.facetsArray.filter((facet) => this._isActiveMultiSelectFacet(facet));
    if (activeMultiSelectFacets.length === 0) return facetValuesArray;

    const multiFacetValuesArray = await this._getMultiFacetValuesArray(activeMultiSelectFacets, list);
    this._replaceFacetsWithMultiFacetsValues(facetValuesArray, multiFacetValuesArray);
    return facetValuesArray;
  }

  /**
   * Create a new query from a template solr query.
   * Properties, relatedProperties, params, modifiers, _and, _or are copied from provided template
   *
   * @param {SolrQuery} templateQuery
   * @param {string} property2strip
   * @returns {SolrQuery}
   */
  _getStripedQuery = (templateQuery, property2strip) => {
    const es = registry.get('entrystore');
    const stripedSolrQuery = es.newSolrQuery();
    const newQueryProperties = templateQuery.properties.filter((property) => property.pred !== property2strip);
    try {
      stripedSolrQuery.properties = JSON.parse(JSON.stringify(newQueryProperties));
      stripedSolrQuery.relatedProperties = JSON.parse(JSON.stringify(templateQuery.relatedProperties));
      stripedSolrQuery.params = new Map(JSON.parse(JSON.stringify([...templateQuery.params])));
      stripedSolrQuery.modifiers = new Map(JSON.parse(JSON.stringify([...templateQuery.modifiers])));
      stripedSolrQuery._and = new Set(JSON.parse(JSON.stringify([...templateQuery._and])));
      stripedSolrQuery._or = new Set(JSON.parse(JSON.stringify([...templateQuery._or])));
    } catch (error) {
      console.log(`Failed cloning a query due to: ${error}`);
    }
    return stripedSolrQuery;
  };

  /**
   * Set current global level facet config if anny
   *
   * @param {object} generalFacetConfig
   * @param {number|string} [generalFacetConfig.facetLimit]
   * @param {number|string} [generalFacetConfig.facetMinCount]
   * @param {boolean|string} [generalFacetConfig.facetMissing]
   */
  setGeneralFacetConfig(generalFacetConfig) {
    this.generalFacetConfig = { ...generalFacetConfig };
  }

  /**
   * Modifies the SolrQuery with all parameters for facets including global level ones from config
   *
   * @param {SolrQuery} searchListSolrQuery
   * @param {Array<object>} facetsArray
   * @returns {void}
   */
  addFacetParameters2Query(searchListSolrQuery, facetsArray = this.facetsArray) {
    this._addFacetFields2Query(searchListSolrQuery, facetsArray);
    this._addFacetMode2Query(searchListSolrQuery);
  }

  /**
   * Completes and sets the facets in registry together with the query for the associated searchList
   *
   * @param {ArrayList} list
   * @returns {Promise<Array|*[]>}
   */
  async getFacetValues(list) {
    if (typeof list.getFacets !== 'function') return;
    return this._getFacetValuesArray(list);
  }
}
