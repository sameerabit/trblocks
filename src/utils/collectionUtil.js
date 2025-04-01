import merge from 'blocks/utils/merge';
import registry from 'blocks/registry';
import config from 'blocks/config/config';
import { namespaces } from '@entryscape/rdfjson';
import params from 'blocks/boot/params';
import labels, { rewrite } from './labels';
import options from './options';
import filter from './filter';
import { getBoolean } from 'blocks/utils/configUtil';

export const mergeCollectionArray = (arr) => {
  const newArr = [];
  const name2col = {};
  arr.forEach((col) => {
    if (name2col[col.name]) {
      merge(name2col[col.name], col);
    } else {
      newArr.push(col);
      name2col[col.name] = col;
    }
  });
  return newArr;
};

export const normalizeCollection = (collection, group) => {
  if (Array.isArray(collection)) {
    collection.forEach((c) => {
      c.group = group;
    });
    return collection;
  }
  return Object.keys(collection).map(key => ({
    label: collection[key],
    value: key,
    group,
  }));
};


/**
 * Translate from simplified object notation to array. That is, from this:
 * {
 *   label1: [val1, val2]
 * }
 *
 * to array form like this:
 * [
 *   {
 *     label: label1,
 *     value: label1,
 *     values: [val1, val2]
 *   }
 * ]
 *
 * Also, if no values are detected (as either array or string), the value is set to __other
 */
export const normalizeCollectionOptions = (collection) => {
  if (collection.options) {
    if (Array.isArray(collection.options)) {
      collection.options.forEach((option) => {
        const values = option.values;
        if (!Array.isArray(values) && typeof values !== 'string') {
          option.value = '__other';
        }
      });
    } else {
      collection.options = Object.keys(collection.options).map((option) => {
        let values = collection.options[option];
        if (!Array.isArray(values)) {
          if (typeof values === 'string') {
            values = [values];
          } else {
            values = undefined;
          }
        }
        return {
          label: option,
          value: values === undefined ? '__other' : option,
          values,
        };
      });
    }
    if (collection.nodetype === 'uri') {
      collection.options.forEach((option) => {
        if (option.values) {
          option.values = option.values.map(v => namespaces.expand(v));
        }
      });
    }
    if (collection.badgeColors) {
      const colors = [];
      Object.keys(collection.badgeColors).forEach((foreground) => {
        collection.badgeColors[foreground].forEach((background) => {
          colors.push({ foreground, background });
        });
      });
      const selectors = [];
      collection.options.forEach((opt, idx) => {
        const color = colors[idx % colors.length];
        selectors.push(`.esbBadge[data-esb-collection-${collection.name}="${opt.value}"] {
   color: ${color.foreground};
   background: ${color.background};
}`);
      });
      const style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = selectors.join('\n');
      document.getElementsByTagName('head')[0].appendChild(style);
    }
  }
};

export const getSelectedItems = (def) => {
  const filters = registry.get('blocks_search_filter') || {};
  const selectedItems = [];
  let cfilter;
  if (filters && filters[def.name]) {
    cfilter = filters[def.name];
    def.list.forEach((item) => {
      cfilter.forEach((fvalue) => {
        if (item.value === fvalue.value) {
          selectedItems.push(item);
        }
      });
    });
  }
  return selectedItems;
};

const getSort = (def) => {
  const sort = def.sort !== undefined && def.sort !== false;
  let sortFn;
  if (typeof def.sort === 'string' && def.sort.startsWith('desc')) {
    sortFn = (a, b) => (a.value === '__not' ? 1 : (a.label.toLowerCase() < b.label.toLowerCase() ? 1 : -1));
  } else {
    sortFn = (a, b) => (a.value === '__not' ? 1 : (a.label.toLowerCase() < b.label.toLowerCase() ? -1 : 1));
  }
  return { sort, sortFn };
};

export const initCollections = (collections, items) => {
  const localize = registry.get('localize');
  const rdfutils = registry.get('rdfutils');
  const _collections = mergeCollectionArray(collections);
  _collections.forEach((def) => {
    const { sort, sortFn } = getSort(def);
    normalizeCollectionOptions(def);
    const notFacetType = ['range', 'check', 'radio'];
    def.includeAsFacet = getBoolean(def.includeAsFacet, true) && !notFacetType.includes(def.type);
    if (def.list) {
      def.type = 'inline';
      def.source = normalizeCollection(def.list, def.name);
      def.list = def.limit > 0 ?
        def.source.slice(0, def.limit) : def.source;
      registry.set(`blocks_collection_${def.name}`, def);
    } else if (def.templatesource) {
      def.type = 'rdforms';
      const item = items.getItem(def.templatesource);
      def.source = item.getStaticChoices().map(choice => ({
        label: localize(choice.label),
        value: choice.value,
        group: def.name,
      }));
      def.list = def.limit > 0 ?
        def.source.slice(0, def.limit) : def.source;
      registry.set(`blocks_collection_${def.name}`, def);
    } else if (def.type === 'preload' || def.preload) {
      const es = registry.get('entrystore');
      const qo = es.newSolrQuery().rdfType(def.rdftype).limit(100);
      if (registry.get('blocks_forcePublicRequests') !== false) {
        qo.publicRead();
      }
      qo.context(def.context === true ? urlParams.context : def.context);
      const entryArr = [];
      def.preloaded = qo.list().forEach((entry) => {
        entryArr.push(entry);
      }).then(() => {
        const collection = [];
        entryArr.forEach((entry) => {
          collection.push({
            entry,
            label: rewrite(rdfutils.getLabel(entry), def),
            value: entry.getResourceURI(),
            group: def.name,
          });
        });
        if (sort) {
          collection.sort(sortFn);
        }
        def.source = collection;
        def.list = collection;
        registry.set(`blocks_collection_${def.name}`, def);
      });
    } else {
      registry.set(`blocks_collection_${def.name}`, def);
    }
  });
  return _collections;
};

const shorten = (value) => {
  if (value?.length > 15) {
    const hidx = value.lastIndexOf('#');
    const sidx = value.lastIndexOf('/');
    return hidx > sidx ? value.substr(hidx + 1) : value.substr(sidx + 1);
  }
  return value;
};

/**
 * Use vocab parameter to lookup label in correct language or revrite it from template/regex. Fallback to shorten
 *
 * @param {string} name
 * @param {object} def
 * @returns {string} label
 */
const getLabelForNodeTypeLiteral = (name, def) => {
  const vocab = def.vocab || {};
  const localize = registry.get('localize');
  if (vocab[name]) return localize(vocab[name]);
  return rewrite(name, def) || shorten(name);
};

/**
 * Remove {count: 0} results and add a name for facetMissing results from server
 *
 * @param {object} facet
 * @returns {object}
 */
const fixResultForFacetMissing = (facet) => {
  return facet.values
    .filter((value) => value.name || value.count)
    .map((value) => {
      return value.name ? value : { ...value, name: '__not' };
    });
};

export const initCollectionListeners = () => {
  registry.onChange('blocks_search_facets', (facets) => {
    const collections = registry.get('blocks_collections');
    const findFacet = d => facets.find(f => (d.property && f.predicate === namespaces.expand(d.property)
      && (!f.type || f.type.indexOf(d.nodetype || 'literal') === 0)));
    collections.forEach((def) => {
      const facet = findFacet(def);
      const group = def.name;
      const { sort, sortFn } = getSort(def);
      if (facet) {
        facet.values = fixResultForFacetMissing(facet);
        def.rawFacetValues = facet;
        def.facetMissingLabel = def.facetMissingLabel || 'None';
        def.changeLoadLimit = (limit) => {
          def.loadedLimit = limit;
          def.limitReached = limit && facet.values.length > limit;
          // If predefined options are specified
          if (def.options) {
            def.source = options.optionsFromFacet(facet, def);
            def.list = def.source.slice(0);
            registry.set(`blocks_collection_${def.name}`, def);
          } else if (def.nodetype === 'literal') {
            const localize = registry.get('localize');
            const vocab = def.vocab || {};
            // Transform so we get the correct labels before we potentially sort and limit
            def.source = facet.values.map(value => ({
              label: vocab[value.name] ? localize(vocab[value.name]) : rewrite(value.name, def) || shorten(value.name),
              value: value.name,
              group,
              occurence: value.count,
            }));
            if (sort) {
              def.source.sort(sortFn);
            }
            if (limit && def.source.length > limit) {
              def.list = def.source.slice(0, limit);
            } else {
              def.list = def.source;
            }
            registry.set(`blocks_collection_${def.name}`, def);
          } else if (def.preload && sort) {
            // Take the first from the preloaded and already sorted
            def.preloaded.then(() => {
              def.list = [];
              def.source.some((sourceObj) => {
                const valueForSourceObj = facet.values.find(v => v.name === sourceObj.value);
                if (valueForSourceObj && valueForSourceObj.count > 0) {
                  def.list.push({
                    label: sourceObj.label,
                    value: sourceObj.value,
                    group: sourceObj.group,
                    occurence: valueForSourceObj ? valueForSourceObj.count : 0,
                  });
                }
                return def.list.length >= limit;
              });
              if (!limit || def.list.length < limit) {
                if (facet.values.some((value) => value.name === '__not')) {
                  const missingFacet = facet.values.find((value) => value.name === '__not');
                  def.list.push({
                    label: def.facetMissingLabel,
                    value: '__not',
                    group: def.name,
                    occurence: missingFacet.count,
                  });
                }
              }
              registry.set(`blocks_collection_${def.name}`, def);
            });
          } else {
            // The values are URIs and not preloaded
            let values = facet.values;
            // No sorting, hence we can limit based on occurence order
            if (!sort && limit && values.length > limit) {
              values = values.slice(0, limit);
            }
            const svalues = values.map(value => value.name);
            labels(svalues, def.nodetype).then((lbls) => {
              if (svalues.includes('__not')) {
                lbls.__not = def.facetMissingLabel;
              }
              def.source = values.map(value => ({
                label: rewrite(lbls[value.name], def) || shorten(value.name),
                value: value.name,
                group,
                occurence: value.count,
              }));
              // We can sort now based on retrieved labels.
              if (sort) {
                def.source.sort(sortFn);
              }
              // If we sorted we have not done the limiting before, hence do it now if needed.
              if (sort && limit && def.source.length > limit) {
                def.list = def.source.slice(0, limit);
              } else {
                def.list = def.source;
              }
              registry.set(`blocks_collection_${def.name}`, def);
            });
          }
        };
        const currentCollectionLimit = def.hasOwnProperty('loadedLimit') ? def.loadedLimit : def.limit;
        def.changeLoadLimit(currentCollectionLimit);
      }
    });
  });

  /**
   * Check if the value should be in the url
   *
   * @param {{group:string,value:Array<string>|string}} activeFilter
   * @param {Array<object>} collections
   * @returns {boolean}
   */
  const includeInUrl = (activeFilter, collections) => {
    if (activeFilter.value === '__other') {
      return false;
    }
    const activeCollection = collections.find((collection) => collection.name === activeFilter.group);
    if (activeCollection?.type && activeCollection.type === 'radio') {
      return activeCollection.options?.some((option) => option.name === activeFilter.value);
    }
    return true;
  };

// Wait for collections to be initialized and parameters to page being known
// then parse page parameters and initiate correct filter.
// Also start listening to the filter, on change update the page parameters.
  registry.onChange('blocks_collections', (collections) => {
    let addListener = true;
    params.addListener((urlParams) => {
      const constraints = [];
      collections.forEach((c) => {
        if (urlParams[c.name]) {
          let arr = urlParams[c.name];
          if (!Array.isArray(arr)) {
            arr = [arr];
          }
          arr.forEach((f) => {
            constraints.push({ group: c.name, value: namespaces.expand(f) });
          });
        }
      });
      if (urlParams.term) {
        if (Array.isArray(urlParams.term)) {
          urlParams.term.forEach((t) => {
            constraints.push({ value: t, label: t, group: 'term' });
          });
        } else {
          constraints.push({
            value: urlParams.term,
            label: urlParams.term,
            group: 'term',
          });
        }
      }
      if (urlParams.limit) {
        registry.set('blocks_limit', parseInt(urlParams.limit[0], 10));
      }
      if (urlParams.sort) {
        const sortOptions = registry.get('blocks_sortOptions');
        const selectedOption = sortOptions.find(option => option.label === urlParams.sort[0]);
        if (selectedOption) {
          registry.set('blocks_sortOrder', selectedOption.value);
        }
      }
      filter.setAll(constraints);
      if (addListener) {
        addListener = false;
        registry.onChange('blocks_search_filter', (filterObj) => {
          const _urlParams = params.getUrlParams();
          delete _urlParams.term;
          collections.forEach((c) => {
            delete _urlParams[c.name];
          });
          Object.keys(filterObj).forEach((key) => {
            const newUrlFilterObj = filterObj[key].filter((activeFilter) => includeInUrl(activeFilter, collections));
            if (Object.keys(newUrlFilterObj).length === 0) return;
            _urlParams[key] = newUrlFilterObj.map((urlFilter) => namespaces.shortenKnown(urlFilter.value));
          });
          params.setLocation('', _urlParams);
        });
      }
    });
  }, true);
};

if (!config.econfig.spa) initCollectionListeners();