import DOMUtil from 'blocks/utils/htmlUtil';
import { namespaces } from '@entryscape/rdfjson';
import '@selectize/selectize';
import jquery from 'jquery';
import filter from 'blocks/utils/filter';
import params from 'blocks/boot/params';
import registry from 'blocks/registry';
import { facetSearchQuery } from 'blocks/utils/query';
import { transformURI } from 'blocks/utils/getHref';
import { getSelectedItems } from 'blocks/utils/collectionUtil';
import utils from './utils';
import './SelectizeExtention';

const rdfutils = registry.get('rdfutils');
const termFilter = (arr, term) => {
  if (term.length > 0) {
    return arr.filter(val => (val.label || '').toLowerCase().indexOf(term.toLowerCase()) > -1);
  }
  return arr;
};

let counter = 1;

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
 *   property - the property to filter the selected values with.
 *   literal - true if the values are to be considered literals.
 */
export default function (node, data) {
  let lock = false;
  if (typeof data.width !== 'undefined') {
    node.style.width = data.width;
  }
  let urlParams = {};
  params.onInit((up) => {
    urlParams = up;
  });

  const filterCollections = (cols) => {
    if (data.include) {
      const include = Array.isArray(data.include) ? data.include : data.include.split(',');
      return include.map(collectionKey => cols.find(col => col.name === collectionKey));
    }
    // eslint-disable-next-line no-nested-ternary
    const exclude = data.exclude ? (Array.isArray(data.exclude) ? data.exclude : data.exclude.split(',')) : [];
    return cols.filter(col => (col.includeAsFacet && !exclude.includes(col.name)));
  };

  const collections = filterCollections(registry.get('blocks_collections'));
  const name2col = {};
  collections.forEach((col) => {
    name2col[col.name] = col;
  });

  let selectize;
  const localItems = {};
  data.openOnFocus = data.openOnFocus !== false;
  data.inlineFilters = data.inlineFilters !== false;
  const settings = {
    plugins: ['preserve_search'],
    valueField: 'value',
    labelField: 'label',
    searchField: 'label',
    optgroupValueField: 'name',
    optgroupLabelField: 'label',
    optgroups: collections,
    optgroupField: 'group',
    mode: 'multi',
    openOnFocus: data.openOnFocus,
    closeAfterSelect: true,
    preload: 'focus',
    create: true,
    addPrecedence: true,
    persist: false,
    onDelete: data.inlineFilters ? undefined : () => false,
    onItemAdd(value) {
      if (lock) {
        selectize.close();
        return;
      }
      const item = selectize.options[value];
      localItems[value] = item;
      if (!item.group && !utils.checkValidSearchString(value, data)) {
        selectize.removeItem(value);
        return;
      }
      lock = true;
      const col = item.group && name2col[item.group] ? name2col[item.group] : {};
      if (data.click || data.namedclick || col.click || col.namedclick) {
        // const urlParams = {};
        const clicks = registry.get('clicks');
        let click = (data.namedclick ? clicks[data.namedclick] : data.click);
        if (col.click || col.namedclick) {
          click = (col.namedclick ? clicks[col.namedclick] : col.click);
        }
        const shortenedValue = namespaces.shortenKnown(item.value);
        if (col.linkparam) {
          switch (col.linkparam) {
            case 'entry':
              if (item.eid && item.cid) {
                urlParams.entry = item.eid;
                urlParams.context = item.cid;
              }
              break;
            case 'group':
              urlParams[item.group] = shortenedValue;
              break;
            default:
              urlParams[col.linkparam] = shortenedValue;
          }
        } else {
          urlParams[item.group || 'term'] = shortenedValue;
        }
        if (click && click.indexOf('esb:') === 0) {
          const pattern = click.substr(4);
          const mask = col.clickmask || data.clickmask;
          const newurl = transformURI(item.value, mask, pattern, {
            entry: item.eid,
            context: item.cid,
            uri: value,
          });
          // This is a link out, hence just set it, don't rely on smartness in params.setLocation as that will
          // append a #/ to avoid a reload when there is no parameters, which is ugly.
          window.location.href = newurl;
        } else {
          params.setLocation(click || '', urlParams);
        }
      } else {
        filter.add(item);
      }
      lock = false;
      selectize.close();
    },
    onItemRemove(value) {
      if (lock) {
        selectize.close();
        return;
      }
      const option = localItems[value];
      delete localItems[value];
      lock = true;
      filter.remove(option || { value });
      lock = false;
      selectize.close();
    },
    onDropdownOpen() { selectize.$control_input.attr('aria-expanded', 'true'); },
    onDropdownClose() { selectize.$control_input.attr('aria-expanded', 'false'); },
    render: {
      option(datum, escape) {
        if (datum.free) {
          const term = escape(datum.label);
          const message = (data.freeSearchTemplate || 'Search for $1').replace('$1', term);
          return `<div>${message}</div>`;
        }
        return `<div>${escape(datum.label)}</div>`;
      },
      item(datum, escape) {
        if (data.inlineFilters) {
          const isFacetItem = datum.group && datum.group !== 'term';
          const itemCls = isFacetItem ? 'esbItemFacet' : 'esbItemTerm';
          const item = DOMUtil.create('button', { class: `item ${itemCls}` }); // TODO  import this when defines are removed
          if (isFacetItem) {
            item.appendChild(DOMUtil.create(
              'span', {
                class: 'group',
                innerHTML: escape(`${name2col[datum.group].label}:`),
              },
            ));
          }
          item.appendChild(DOMUtil.create('span', {
            class: 'itemLabel',
            innerHTML: escape(datum.label),
          }));

          const faRemoveIconEl = DOMUtil.create('i', {
            class: 'fas fa-times',
          });
          item.onclick = () => {
            selectize.removeItem(datum.value);
          };
          item.appendChild(faRemoveIconEl);

          return item;
        }
        return DOMUtil.create('span');
      },
      option_create(d, escape) {
        if (!utils.checkValidSearchString(d.input, data)) {
          return `<div class="esbSearchError">${utils.invalidSearchStringMessage(data)}</div>`;
        }
        const term = escape(d.input);
        const message = (data.freeSearchTemplate || 'Search for "$1"').replace('$1', term);
        return `<div class="create">${message}</div>`;
      },
    },
  };

  data.placeholder = data.placeholder || 'Search for...';
  const input = DOMUtil.create('input', utils.commonAttrs({ type: 'text' }, data));
  node.appendChild(input);
  const getLoads = () => collections.filter(def => getSelectedItems(def).length === 0).map(def => (query) => {
    if (def.type === 'search') {
      /* const es = registry.get('entrystore');
      const qo = es.newSolrQuery().publicRead();
      const contextId = def.context || (data.context === true ? urlParams.context : data.context);
      if (contextId) {
        qo.context(contextId);
      }
      if (def.rdftype) {
        qo.rdfType(def.rdftype);
      }
      const term = query.length > 0 ? query : '*';
      if (def.searchproperty) {
        qo.literalProperty(def.searchproperty, term);
      } else {
        qo.title(term);
      } */
      return facetSearchQuery(query, data, def)
        .limit(6)
        .getEntries()
        .then(arr => arr.map(entry => ({
          value: entry.getResourceURI(),
          eid: entry.getId(),
          cid: entry.getContext().getId(),
          label: rdfutils.getLabel(entry),
          group: def.name,
        })));
    }
    return new Promise((resolve) => {
      registry.get(`blocks_collection_${def.name}`);
      return resolve(termFilter(def.list || [], query));
    });
  });

  settings.load = (_query, callback) => {
    const query = _query.toLowerCase();
    const getDropdownLimit = () => {
      if (!data.limit) return 20;
      return typeof data.limit === 'string' ? parseInt(data.limit, 10) : data.limit;
    };
    if (!utils.checkValidSearchString(query, data)) {
      callback([]);
      return;
    }
    Promise.all(getLoads().map(ld => ld(query))).then((searchResults) => {
      const results = [];
      let pos = 0;
      let searchResultsLeftToAdd = true;
      const addToResults = () => {
        searchResults.forEach((arr) => {
          const v = arr[pos];
          if (v) {
            searchResultsLeftToAdd = true;
            if (v.label.toLowerCase().indexOf(query) !== -1) {
              results.push(v);
            }
          }
        });
      };
      const dropdownLimit = getDropdownLimit();
      while (results.length < dropdownLimit && searchResultsLeftToAdd) {
        searchResultsLeftToAdd = false;
        addToResults();
        pos += 1;
      }
      if (data.openOnFocus || query.length > 0) {
        callback(results);
      } else {
        // Set input as hidden to avoid trigger of dropdown on initial load
        selectize.isInputHidden = true;
        callback(results);
        selectize.isInputHidden = false;
      }
    });
  };

  // Initialize after load function is added
  selectize = jquery(input).selectize(settings)[0].selectize;
  selectize.$control_input.attr('aria-controls', `esbListbox_${counter}`);
  selectize.$control_input.attr('role', 'combobox');
  selectize.$control_input.attr('aria-expanded', 'false');
  selectize.$control_input.attr(utils.commonAttrs({}, data));
  selectize.$dropdown_content.attr('id', `esbListbox_${counter}`);
  counter += 1;

  // Listen in and update search field if other parts of the ui changes the filter
  registry.onChange('blocks_search_filter', (filters) => {
    const items = selectize.items; // preserving old way of clearing options
    selectize.clearOptions(true);
    items.forEach((item) => {
      selectize.addItem(item, true);
    });
    if (lock) {
      // If selectize is itself making the change
      return;
    }
    const setItem = (item) => {
      // Avoid adding the item if it is excluded via the include or exclude settings
      if (item && item.group !== 'term' && !name2col[item.group]) {
        return;
      }
      lock = true;
      selectize.addOption(item);
      localItems[item.value] = item;
      selectize.addItem(item.value, true);
      lock = false;
    };
    Object.keys(filters).forEach((group) => {
      utils.setValues(filters, group, setItem);
    });
    selectize.items.slice(0).forEach((value) => {
      const item = selectize.options[value];
      const filt = filters[item.group || 'term'] || [];
      if (!filt.find(fival => (fival.value === item.value && fival.group === item.group))) {
        delete localItems[item.value];
        selectize.removeItem(item.value, true);
      }
    });
    lock = false;
  }, true);

  const clickOnEnter = () => {
    const val = selectize.$control_input.val().trim();
    if (!selectize.isOpen && val === '' && (data.click || data.namedclick)) {
      const clicks = registry.get('clicks');
      const click = (data.namedclick ? clicks[data.namedclick] : data.click);
      params.setLocation(click || '', urlParams);
      return true;
    }
    return false;
  };

  registry.onChange('multiSearch-search', () => {
    if (!clickOnEnter() && selectize.$activeOption) {
      selectize.onOptionSelect({ currentTarget: selectize.$activeOption });
    } else {
      selectize.createItem();
    }
  });
  selectize.$control_input.on('keyup', (e) => {
    // If enter
    if (e.keyCode === 13) {
      clickOnEnter();
    }
  });
}
