import registry from 'blocks/registry';
import { namespaces } from '@entryscape/rdfjson';
import { termsConstraint } from 'blocks/utils/query';
import { getBoolean } from 'blocks/utils/configUtil';
import collectionOptions from './options';

const add = (filter, option) => {
  const group = option.group || 'term';
  let arr = filter[group];
  if (!arr) {
    arr = [];
    filter[group] = arr;
  }
  if (!arr.find(item => item.value === option.value)) {
    arr.push(option);
  }
};

const dateConvert = val => (val ? new Date(val) : undefined);

/* Adds a day, month or year to make end of intervall inclusive */
const dateConvertEndOfIntervall = (val) => {
  if (!val) { return undefined; }
  const regexp = new RegExp(/(\d{0,4})-?(\d{0,2})-?(\d{0,2})/);
  const matches = val.match(regexp) || [];
  let endDate;
  if (matches[3].length === 2) {
    endDate = new Date(parseInt(matches[1], 10), parseInt(matches[2], 10) - 1, (parseInt(matches[3], 10) + 1));
  } else if (matches[2].length === 2) {
    endDate = new Date(parseInt(matches[1], 10), parseInt(matches[2], 10)); /* Months are numbered 0-11 */
  } else if (matches[1].length === 4) {
    endDate = new Date((parseInt(matches[1], 10) + 1).toString()); /* Year needs to be string when given as single argument */
  }
  return endDate;
};

const maybeResets = (filter, group) => {
  const collection = registry.get(`blocks_collection_${group}`);
  if (collection && collection.resets) {
    delete filter[collection.resets];
  }
};

let lock = false;
// Timeout for unlock since hash change is detected via polling (dojo/hash)
// and has a delay of 100 ms
const unlock = () => {
  setTimeout(() => {
    lock = false;
  }, 150);
};

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

const filterObj = {
  clear() {
    if (lock) {
      return;
    }
    lock = true;
    registry.set('blocks_search_filter', {});
    unlock();
  },
  setAll(options) {
    if (lock) {
      return;
    }
    lock = true;
    const filter = {};
    (options || []).forEach((option) => {
      add(filter, option);
    });
    registry.set('blocks_search_filter', filter);
    unlock();
  },
  addAll(options) {
    if (lock) {
      return;
    }
    lock = true;
    const filter = registry.get('blocks_search_filter') || {};
    (options || []).forEach((option) => {
      add(filter, option);
    });
    registry.set('blocks_search_filter', filter);
    unlock();
  },
  add(option) {
    if (lock) {
      return;
    }
    lock = true;
    const filter = registry.get('blocks_search_filter') || {};
    add(filter, option);
    maybeResets(filter, option.group || 'term');
    registry.set('blocks_search_filter', filter);
    unlock();
  },
  remove(option) {
    filterObj.replace(option);
  },
  replace(oldOption, newOption) {
    if (lock) {
      return;
    }
    lock = true;
    const filter = registry.get('blocks_search_filter') || {};
    let group;
    if (oldOption) {
      group = oldOption.group || 'term';
      const arr = filter[group];
      if (arr) {
        const idx = arr.findIndex(el => (el.value === oldOption.value));
        arr.splice(idx, 1);
        if (arr.length === 0) {
          delete filter[group];
        }
      }
    }
    if (newOption) {
      group = newOption.group || 'term';
      add(filter, newOption);
    }
    maybeResets(filter, group || 'term');
    registry.set('blocks_search_filter', filter);
    unlock();
  },
  globalFilter(obj) {
    const bf = registry.get('blocks_filter');
    if (bf) {
      if (typeof bf === 'function') {
        bf(obj);
      } else {
        obj.or(bf);
      }
    }
  },
  constraints(obj) {
    const filter = registry.get('blocks_search_filter') || {};
    const filterIdx = {};
    const collections = registry.get('blocks_collections') || [];
    // find collections that are of type radio but has no valid value set in filter
    const radioDefaultCollections = collections.filter(
      (collection) =>
        collection.type === 'radio' &&
        !collection.options?.some((opt) =>
          filterObj.has(collection.name, opt.name)
        )
    );
    if (radioDefaultCollections.length > 0) {
      radioDefaultCollections.forEach((defaultCollection) => {
        if (defaultCollection.options[0].query) {
          updateQueryWithStructure(defaultCollection.options[0].query, obj);
        }
      });
    }
    collections.forEach((c) => {
      filterIdx[c.name] = c;
    });
    let noTermsConstraint = true;
    Object.keys(filter).forEach((key) => {
      let vals = filter[key].map((v) => {
        if (typeof v === 'string') {
          return v;
        }
        return v.value;
      });
      const filterDef = filterIdx[key];
      if (filterDef && filterDef.type === 'radio') {
        const radioQueryOption = filterDef.options?.find((opt) => vals.includes(opt.name));
        if (radioQueryOption && radioQueryOption.query) {
          updateQueryWithStructure(radioQueryOption.query, obj);
        }
        return;
      }
      const filterOnMissingProperty = vals.includes('__not');
      if (filterDef && filterDef.options && !filterOnMissingProperty) {
        vals = collectionOptions.constraintValuesFromOptions(filterDef, vals);
      }
      if (filterDef && filterDef.appendWildcard) {
        vals = vals.concat(vals.map(v => `${v}*`));
      }
      switch (key) {
        case 'tags':
          return;
        case 'term':
          termsConstraint(obj, vals);
          noTermsConstraint = false;
          return;
        case 'type':
          obj.rdfType(vals);
          return;
        default:
      }
      const prop = filterDef.property;
      if (filterDef.type === 'range' && prop) {
        let from;
        let to;
        vals.forEach((v) => {
          if (v.startsWith('from:')) {
            from = v.substr(5);
          } else if (v.startsWith('to:')) {
            to = v.substr(3);
          }
        });
        switch (prop) {
          case 'modified':
            obj.modifiedRange(dateConvert(from), dateConvert(to));
            break;
          case 'created':
            obj.createdRange(dateConvert(from), dateConvert(to));
            break;
          default:
            if (filterDef.nodetype === 'date') {
              obj.datePropertyRange(prop, dateConvert(from), dateConvertEndOfIntervall(to));
            } else if (filterDef.nodetype === 'integer') {
              obj.integerPropertyRange(prop, from, to);
            }
        }
      } else if (filterDef.type === 'check') {
        vals = filterDef.values;
        if (namespaces.expand(prop) === namespaces.expand('rdf:type')) {
          obj.rdfType(vals, filterDef.modifier);
        } else if (filterDef.nodetype === 'literal') {
          obj.literalProperty(prop, vals, filterDef.modifier, filterDef.searchIndextype, filterDef.related);
        } else {
          obj.uriProperty(prop, vals, filterDef.modifier, filterDef.related);
        }
      } else if (prop) {
        const modifier = filterOnMissingProperty;
        vals = filterOnMissingProperty ? '*' : vals;
        if (namespaces.expand(prop) === namespaces.expand('rdf:type')) {
          obj.rdfType(vals);
        } else if (filterDef.nodetype === 'literal') {
          obj.literalProperty(prop, vals, modifier, filterDef.searchIndextype, filterDef.related);
        } else {
          obj.uriProperty(prop, vals, modifier, filterDef.related);
        }
      }
    });
    if (noTermsConstraint) {
      termsConstraint(obj);
    }
    return obj;
  },
  isEmpty() {
    const vals = registry.get('blocks_search_filter');
    return !(vals && Object.keys(vals).length > 0);
  },
  has(collectionname, value) {
    let vals = (registry.get('blocks_search_filter') || {})[collectionname];
    if (vals) {
      if (value === undefined) {
        return true;
      }
      const collection = registry.get(`blocks_collection_${collectionname}`);
      vals = vals.map(v => (typeof v === 'string' ? v : v.value));
      return vals.some(v => (collection.nodetype === 'literal' ? value :
        v === namespaces.expand(value)));
    }
    return false;
  },
  guard(node, conditional) {
    if (conditional) {
      const conditions = Array.isArray(conditional) ? conditional : conditional.split(',');
      const splitConditions = conditions.map((condition) => {
        return {
          depColName: condition.split('==')[0],
          depVal: condition.split('==')[1],
        };
      });
      const update = () => {
        let display = false;
        splitConditions.forEach((condition) => {
          if (filterObj.has(condition.depColName, condition.depVal)) {
            display = true;
          }
        });
        node.style.display = display ? '' : 'none';
      };
      update();
      registry.onChange('blocks_search_filter', update);
    }
  },

  /**
   * Get all filter group values as object.
   * Object keys are the collection names
   * return {collectionName: array(values), collectionName: array(values)}
   */
  getFilterGroupValues: () => {
    const filters = registry.get('blocks_search_filter');
    const filterGroupValues = [];
    Object.keys(filters).forEach((group) => {
      filterGroupValues[group] = [];
      filters[group].forEach((option) => {
        if (option.value) {
          filterGroupValues[group].push(option.value);
        }
      });
    });
    return filterGroupValues;
  },
  /**
   * Will replace given filter-groups (collectionName) and values with new.
   * newGroupSettings: {collectionName: array(newValues), collectionName: array(newValues)}
   */
  updateFilter(newGroupSettings) {
    const filters = registry.get('blocks_search_filter');
    const groupsToSet = Object.keys(newGroupSettings);
    groupsToSet.forEach((group) => {
      if (filters[group]) {
        delete filters[group];
      }
    });
    const newOptionsArray = [];
    groupsToSet.forEach((group) => {
      if (Array.isArray(newGroupSettings[group])) {
        newGroupSettings[group].forEach((value) => {
          newOptionsArray.push({ group, value });
        });
      }
    });
    filterObj.addAll(newOptionsArray);
  },
};

registry.set('searchFilter', filterObj);

export default filterObj;
