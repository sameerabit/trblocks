import registry from 'blocks/registry';
import mapKeys from 'lodash-es/mapKeys';
import { namespaces } from '@entryscape/rdfjson';
import { initCollections } from 'blocks/utils/collectionUtil';
import { initState } from 'blocks/utils/stateUtil';
import { getBoolean } from 'blocks/utils/configUtil';
import FacetStore from 'blocks/utils/FacetStore';

/**
 * Extract and set correct type from global facet config
 *
 * @param {object} config
 * @param {number|string} [config.facetLimit]
 * @param {number|string} [config.facetMinCount]
 * @param {boolean|string} [config.facetMissing]
 * @returns {object}
 */
const extractGeneralFacetConfig = (config) => {
  const generalFacetConfigOptions = [
    { name: 'facetLimit', type: 'number' },
    { name: 'facetMinCount', type: 'number' },
    { name: 'facetMissing', type: 'boolean' },
  ];
  const generalFacetConfig = {};
  const generalFacetConfigOptionsInUse = generalFacetConfigOptions.filter((facetConfigOption) => {
    return config.hasOwnProperty(facetConfigOption.name);
  });
  generalFacetConfigOptionsInUse.forEach((facetConfigOption) => {
    const { name, type } = facetConfigOption;
    const value = config[name];
    if (type === 'number') {
      generalFacetConfig[name] = parseInt(value, 10);
    }
    if (type === 'boolean') {
      generalFacetConfig[name] = getBoolean(value, false);
    }
  });
  return generalFacetConfig;
};

export default function (node, data, items) {
  let named = registry.get('blocks_named') || {};
  if (data.named) {
    named = { ...named, ...mapKeys(data.named, (value, key) => namespaces.expand(key)) };
  }
  registry.set('blocks_named', named);
  if (data.forcePublicRequests !== undefined) {
    registry.set('blocks_forcePublicRequests', data.forcePublicRequests);
    const esu = registry.get('entrystoreutil');
    esu.loadOnlyPublicEntries(data.forcePublicRequests === true || data.forcePublicRequests === 'true');
  }

  const itemstore = registry.get('itemstore');
  let val2choice = registry.get('itemstore_choices');
  if (!val2choice) {
    val2choice = {};
    itemstore.getItems().forEach((item) => {
      if (item.getType() === 'choice') {
        (item.getStaticChoices() || []).forEach((choice) => {
          val2choice[choice.value] = choice;
        });
      }
    });
    registry.set('itemstore_choices', val2choice);
  }
  if (data.sortOptions) {
    registry.set('blocks_sortOptions', data.sortOptions);
    registry.set('blocks_sortOrder', data.sortOptions[0].value);
  }
  if (data.limitOptions) {
    registry.set('blocks_limitOptions', data.limitOptions);
    registry.set('blocks_limit', parseInt(data.limitOptions[0], 10));
  }
  if (data.linkBehaviour) {
    registry.set('linkBehaviour', data.linkBehaviour);
  }

  if (data.query) {
    registry.set('blocks_query', data.query);
  }

  if (data.emptyQuery) {
    registry.set('blocks_empty_query', data.emptyQuery);
  }

  if (data.filter) {
    registry.set('blocks_filter', data.filter);
  }

  if (data.minimumSearchLength) {
    registry.set('blocks_minimumSearchLength', data.minimumSearchLength);
  }

  if (data.strictStandardHtml) {
    registry.set('blocks_strictStandardHtml', String(data.strictStandardHtml) === 'true');
  }

  if (data.baseMap) {
    registry.set('base_map', data.baseMap);
  }

  let clicks = registry.get('clicks');
  if (!clicks) {
    clicks = {};
    registry.set('clicks', clicks);
  }

  if (data.clicks) {
    Object.assign(clicks, data.clicks);
  }

  if (data.urlQueryParameters) {
    registry.set('blocks_urlQueryParameters', getBoolean(data.urlQueryParameters, false));
  }

  const es = registry.get('entrystore');
  if (data.jsonp === true || data.jsonp === 'true') {
    es.getREST().enableJSONP();
  }

  if (data.credentials === true || data.credentials === 'true') {
    es.getREST().enableCredentials();
  }

  if (data.requestCache === true || data.requestCache === 'true') {
    es.setRequestCachePrevention(false);
  }

  if (data.timeout !== undefined && isNaN(parseInt(data.timeout, 10))) {
    const async = registry.get('asynchandler');
    async.progressDelay = parseInt(data.timeout, 10);
  }

  if (data.state) {
    initState(data.state);
    registry.set('blocks_state_config', data.state);
  }

  if (data.collections) {
    data.collections = initCollections(data.collections, items);
    const facetStore = new FacetStore(data.collections);
    registry.set('blocks_facet_store', facetStore);
    const collections = registry.get('blocks_collections') || [];
    registry.set('blocks_collections', collections.concat(data.collections));
    if (data.facetLimit || data.facetMinCount || data.facetMissing) {
      const generalFacetConfig = extractGeneralFacetConfig(data);
      facetStore.setGeneralFacetConfig(generalFacetConfig);
    }
  }
  if (data.style) {
    const styleElement = document.createElement('style');
    const css = document.createTextNode(data.style);
    styleElement.appendChild(css);
    document.head.append(styleElement);
  }
}
