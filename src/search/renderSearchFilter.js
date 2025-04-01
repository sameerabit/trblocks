import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import filter from 'blocks/utils/filter';
import jquery from 'jquery';
import '@selectize/selectize';
import { Entry } from '@entryscape/entrystore-js';
import template from 'lodash-es/template';
import { facetSearchQuery, cloneWithoutFacets } from 'blocks/utils/query';
import utils from './utils';

const rdfutils = registry.get('rdfutils');

/**
 * Renders a dropdown filter with typeahead functionality.
 * Selected values will be used by the "search" component (renderSearchList) as constraints.
 *
 * Depending on the parameters provided it works a bit differently:
 *   rdftype - requests will be made to entrystore to retrieve all entries with this type
 *   context - restrict a search to the specified context,
 *             if set to "true" it uses the context from the urlParams.
 *   collection - name of a collection from where values will be taken,
 *              the collection is typically provided via a preloaded component
 *   openOnFocus - by default true, if set to false the dropdown will appear after typing one character
 *   freeText   - if set to true the first option will be a "search for" option that does a free text match
 *   freeTextTemplate - if freeText is provided the freeTextTemplate contains the search option, provide a
 *   ${term} inside to provide the typed text.
 *   matchStartOfWord - if set to true the input will only match against the beginning of words
 *   property - the property to filter the selected values with.
 *   literal - true if the values are to be considered literals.
 */
export default function (node, data) {
  node.classList.add('block_searchFilter');
  filter.guard(node, data.if);
  if (typeof data.width !== 'undefined') {
    node.style.width = data.width;
  }

  const input = DOMUtil.create('input', utils.commonAttrs({ type: 'text' }, data));
  node.appendChild(input);
  let selectize;
  let selectedOption;
  let lock = false;
  let clearOptions;

  const clearEmptyValue = (value) => {
    if (value === '' && data.allowEmptyOption !== false) {
      setTimeout(() => {
        selectize.removeItem('', true);
        selectize.showInput();
      }, 20);
    }
  };

  // eslint-disable-next-line no-template-curly-in-string
  const fst = template(data.freeTextTemplate || 'Search for "${term}"');
  data.openOnFocus = data.openOnFocus !== false;
  let lowestFacetCount = 0;
  const settings = {
    valueField: 'value',
    labelField: 'label',
    searchField: 'label',
    highlight: false,
    placeholder: data.placeholder,
    allowEmptyOption: data.allowEmptyOption !== false,
    sortField: [{ field: 'occurence', direction: 'desc' }, { field: '$score' }],
    mode: 'single',
    openOnFocus: data.openOnFocus,
    closeAfterSelect: true,
    preload: 'focus',
    create: true,
    render: {
      option(d, escape) {
        const label = d.value === '' ? data.emptyLabel || '&nbsp;' : escape(d.label);
        let occurence = '';
        if (typeof d.occurence !== 'undefined') {
          if (d.occurence === -1) {
            if (lowestFacetCount == 0) {
              occurence = ' (0)';
            } else {
              occurence = ` (<${lowestFacetCount+1})`;
            }
          } else {
            occurence = ` (${d.occurence})`;
          }
        }
        return `<div>${label}${occurence}</div>`;
      },
      item(d, escape) {
        if (d.value === '') {
          return `<div class="label--empty">${data.emptyLabel || ''}</div>`;
        }
        return `<div>${escape(d.label)}</div>`;
      },
      option_create(datum, escape) {
        if (!utils.checkValidSearchString(datum.input, data)) {
          return `<div class="esbSearchError">${utils.invalidSearchStringMessage(data)}</div>`;
        } else if (data.freeText) {
          return `<div class="create esbSearch">${fst({ term: escape(datum.input) })}</div>`;
        }
        return null;
      },
    },
  };

  if (data.matchStartOfWord) {
    settings.score = search => (option) => {
      const idx = option.label.toLowerCase().indexOf(search.toLowerCase());
      return idx === 0 || option.label[idx - 1] === ' ' ? 1 : 0;
    };
  }

  const collectionName = `blocks_collection_${data.collection}`;
  settings.load = (q, cb) => {
    const query = q.toLowerCase();
    if (!utils.checkValidSearchString(query, data)) {
      cb([]);
      return;
    }
    const callback = data.openOnFocus || query.length > 0 ? cb : (results) => {
      selectize.isInputHidden = true;
      cb(results);
      selectize.isInputHidden = false;
    };
    const collection = registry.get(collectionName);
    if (collection.type === 'search') {
      facetSearchQuery(query, data, collection)
        .limit(parseInt(data.limit || collection.limit || 10, 10))
        .getEntries()
        .then((arr) => {
          callback(arr.map(entry => ({
            value: entry.getResourceURI(),
            label: rdfutils.getLabel(entry),
            group: data.collection,
          })));
        }, () => {
          callback();
        });
    } else if (query != null && query.length > 0 && collection.type === 'facet'
      && collection.nodetype === 'uri' && (collection.rdftype || collection.searchproperty)) {
      const val2Occ = {};
      lowestFacetCount = collection.limitReached
        ? collection.rawFacetValues.values[collection.rawFacetValues.values.length - 1].count
        : 0;
      collection.rawFacetValues.values.forEach((v) => {
        val2Occ[v.name] = v.count;
      });
      facetSearchQuery(query, data, collection)
        .limit(parseInt(data.limit || collection.limit || 10, 10))
        .getEntries()
        .then((arr) => {
          clearOptions();
          const vals = arr.map(entry => ({
            value: entry.getResourceURI(),
            group: data.collection,
            occurence: val2Occ[entry.getResourceURI()] || -1,
            label: rdfutils.getLabel(entry),
          }));
          callback(vals);
          if (vals.length > 0) {
            selectize.setActiveOption(selectize.getOption(vals[0].value));
          }
        }, () => {
          callback();
        });
    } else if (query != null && query.length > 0 && collection.type === 'facet'
      && collection.nodetype === 'literal' && collection.property &&
      (!collection.options || collection.options.length === 0)) {
      // Fetch matching values using the current faceted query, but with the provided search term.
      const prevFacetQuery = registry.get('blocks_search_facets_query');
      if (prevFacetQuery) {
        const newFacetQuery = cloneWithoutFacets(prevFacetQuery);
        newFacetQuery.literalFacet(collection.property, collection.related);
        newFacetQuery.limit(0);
        if (query.length < 3) {
          newFacetQuery.literalProperty(collection.property, `${query}*`, undefined, 'text', collection.related);
        } else {
          newFacetQuery.literalProperty(collection.property, [query, `${query}*`], undefined, 'ngram', collection.related);
        }
        const newFacetList = newFacetQuery.list();
        newFacetList.getEntries().then(() => {
          clearOptions();
          const vals = newFacetList.getFacets()[0].values.map(v => ({
            value: v.name,
            group: data.collection,
            occurence: v.count,
            label: v.name,
          }));
          callback(vals);
          if (vals.length > 0) {
            selectize.setActiveOption(selectize.getOption(vals[0].value));
          }
        }, () => {
          callback();
        });
      }
    } else if (collection.list && collection.list.length > 0) {
      if (collection.list[0] instanceof Entry) {
        callback(collection.list.map(entry => ({
          value: entry.getResourceURI(),
          label: rdfutils.getLabel(entry),
          group: data.collection,
        })));
      } else {
        // If we have an option loaded from before without occurence given, update it.
        if (selectize.items && selectize.items.length === 1) {
          const key = selectize.items[0];
          const member = collection.list.find(m => m.value === key);
          if (member) {
            selectize.options[key].occurence = member.occurence;
          }
          selectize.clearCache();
        }
        callback(collection.list);
      }
    } else if (collection.type === 'facet') {
      callback(collection.list);
    }
  };
  // Initialize after load function is added
  selectize = jquery(input).selectize(settings)[0].selectize;
  selectize.$control_input.attr(utils.commonAttrs({}, data));
  selectize.on('change', (value) => {
    const newOption = value !== '' ? selectize.options[value] : undefined;
    if ((!newOption || !newOption.group) && !utils.checkValidSearchString(value, data)) {
      selectize.clear();
      return;
    }
    lock = true;
    clearEmptyValue(value);
    if (newOption && !newOption.group) {
      newOption.group = data.collection;
      newOption.value = value;
    }
    filter.replace(selectedOption, newOption);
    if (!newOption) {
      clearOptions();
    }
    selectedOption = newOption;
    lock = false;
  });

  clearEmptyValue(selectize.getValue());

  clearOptions = () => {
    if (selectize.getValue() === '') {
      Object.keys(selectize.options).forEach((o) => {
        if (o !== '') {
          selectize.removeOption(o);
        }
      });
      selectize.refreshOptions(false);
      selectize.loadedSearches = {};
    }
  };

  registry.onChange('blocks_search_filter', (filters) => {
    if (lock) {
      // If the filter is itself making the change
      return;
    }

    // Remove the value if it is not in the filters.
    if (!filters[data.collection] && selectedOption) {
      selectize.removeItem(selectedOption.value);
    }
    // Add value if it is in the filter
    utils.setValues(filters, data.collection, (item) => {
      lock = true;
      selectize.addOption(item);
      selectize.addItem(item.value, true);
      selectedOption = item; // due to silent flag on line above
      lock = false;
    });

    // Clear available options in some cases
    lock = true;
    clearOptions();
    lock = false;
  }, true);
}
