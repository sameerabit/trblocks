import 'blocks/tabs/esb-tabs';
import getEntry from 'blocks/utils/getEntry';
import registry from 'blocks/registry';
import handlebars from 'blocks/boot/handlebars';
import filter from 'blocks/utils/filter';
import constraints from 'blocks/utils/constraints';
import { namespaces } from '@entryscape/rdfjson';
import { i18n } from 'esi18n';
import { getBoolean } from 'blocks/utils/configUtil';

/**
 * Properties marked with (*) can be overwritten on a tab level
 *
 * @typedef {object} TabsConfig
 * @property {string} [buttonClass] (*) A class for the buttons that will overwrite the default bootstrap class
 * @property {string} [relation] (*) What relation do the entries for the separate tabs have to current entry
 * @property {string} [relationinverse] (*) Entries for the tabs have a relation of this type to the current entry
 * @property {object} [constraints] OR constraints for the query ~ will modify query with NOT for the constraint
 * @property {string} [fallback] Template to show if no results
 * @property {string} [sortOrder] Sort order for the query
 * @property {string} [buttonTemplate] (*) Content for the buttons defaults to the title if given
 * @property {string} contentTemplate (*) Content for the container
 * @property {string|number|object} [entry] * The entry to use for the block, usually fetched from a list or the url
 * @property {TabConfig[]} [tabs] The order of the tabs from left to right [{property: value},...]
 * @property {string|boolean} [useNoLangSort = false] To sort on literals with no language value
 * @property {number|string} [limit] Limit for the relation or relationinverse queries
 * @property {'tabs'} extends Names the block to extend
 * @property {string} [block] Custom block name
 */

/**
 * @typedef {object} TabConfig
 * @property {object} entry The entry for the tab
 * @property {string} [relation=TabsConfig.relation] Override for relation
 * @property {string} [relationinverse=TabsConfig.relationinverse] Override for relationinverse
 * @property {string} [buttonClass=TabsConfig.buttonClass] Override for buttonClass
 * @property {string} [buttonTemplate=TabsConfig.buttonTemplate] Override for buttonTemplate
 * @property {string} [contentTemplate=TabsConfig.contentTemplate] Override for contentTemplate
 * @property {object|string} [match='rest'] constraint(s) to match {property: 'value'}. If multiple constraints are
 * given they will be applied with 'OR'. If useRelation=true defaults to 'rest'
 */

let counter = 1;

/**
 * Fetch entries one relation away
 *
 * @param {Array<object>} tabConfig
 * @param {TabsConfig} data
 * @returns {Promise<Array>}
 */
const loadEntries = async (tabConfig, data) => {
  const es = registry.get('entrystore');
  const query = es.newSolrQuery();
  const md = tabConfig.entry.getAllMetadata();
  const entryURI = tabConfig.entry.getResourceURI();
  if (tabConfig.relation) {
    const entryURIs = md
      .find(entryURI, tabConfig.relation)
      .map((stmt) => stmt.getValue());
    if (entryURIs.length === 0) {
      return Promise.resolve([]);
    }
    query.resource(entryURIs);
  } else if (tabConfig.relationinverse) {
    query.uriProperty(tabConfig.relationinverse, entryURI, false);
  }
  if (data.constraints) {
    constraints(query, data.constraints);
  }
  if (data.limit) {
    query.limit(data.limit);
  }
  const l = getBoolean(data.useNoLangSort, false) ? 'nolang' : i18n.getLocale();
  if (data.sortOrder) {
    if (data.sortOrder === 'title') {
      query.sort(`title.${l}+asc`);
    } else {
      query.sort(data.sortOrder);
    }
  }
  if (registry.get('blocks_forcePublicRequests') !== false) {
    query.publicRead();
  }
  return query.getEntries(0);
};

/**
 * Creates a map with constraint property as key and entry as value
 *
 * @param {Array<object>} entries
 * @param {Array<object>} tabsArray
 * @returns {Map<string, Array<object>>}
 */
const matchEntriesToConstraints = (entries, tabsArray) => {
  const entriesLeftToMatch = [...entries];
  const matchConstraintsArray = tabsArray
    .filter((tab) => tab.match)
    .map((tab) => tab.match);
  const entriesMap = new Map();
  matchConstraintsArray.forEach((constraint) => {
    Object.keys(constraint).forEach((property) => {
      const valueToMatch = namespaces.expand(constraint[property]);
      if (property !== 'rest') {
        entriesLeftToMatch.forEach((entry, index) => {
          if (entry === null) {
            return;
          }
          const values = entry
            .getAllMetadata()
            .find(entry.getResourceURI(), property)
            .map((stmt) => stmt.getValue());
          if (values.includes(valueToMatch)) {
            const constraintKey = JSON.stringify(constraint);
            if (entriesMap.get(constraintKey)) {
              entriesMap.get(constraintKey).push(entry);
            } else {
              entriesMap.set(constraintKey, [entry]);
            }
            entriesLeftToMatch[index] = null;
          }
        });
      }
    });
  });
  entriesLeftToMatch.forEach((entry) => {
    const restKey = JSON.stringify('rest');
    if (entry) {
      if (entriesMap.get(restKey)) {
        entriesMap.get(restKey).push(entry);
      } else {
        entriesMap.set(restKey, [entry]);
      }
    }
  });
  return entriesMap;
};

/**
 * Make a key to be used for Map of entries
 *
 * @param {object} obj
 * @param {string|null} [obj.relation]
 * @param {string|null} [obj.relationinverse]
 * @returns {string}
 */
const getRelationKey = ({ relation = null, relationinverse = null }) => {
  if (relation) return `RELATION_${relation}`;
  if (relationinverse) return `RELATIONINVERSE_${relationinverse}`;
  return 'NONE';
};

/**
 * Adds default values and a relationKey. Returns an array of tabConfig objects
 *
 * @param {object} obj
 * @param {object|null} obj.entry
 * @param {string|null} [obj.relation]
 * @param {string|null} [obj.relationinverse]
 * @param {string|null} [obj.buttonTemplate]
 * @param {string} [obj.buttonClass='btn btn-light esbTabs__button']
 * @param {string} [obj.contentTemplate = '']
 * @param {string} [obj.match='rest']
 * @param {Array<object>} obj.tabs
 * @returns {Array<object>}
 */
const getTabConfigs = (data) => {
  const defaultValues = {
    entry: null,
    relation: null,
    relationinverse: null,
    buttonTemplate: null,
    buttonClass: 'btn btn-light esbTabs__button',
    contentTemplate: '',
    match: 'rest',
    tabs: [{}],
  };
  const defaultTabConfig = { ...defaultValues, ...data };
  const tabConfigs = [];
  defaultTabConfig.tabs.forEach((tab) => {
    const tabConfig = { ...defaultTabConfig, ...tab };
    if (tab.relation) {
      tabConfig.relationinverse = null;
    }
    if (tab.relationinverse) {
      tabConfig.relation = null;
    }
    tabConfig.relationKey = getRelationKey(tabConfig);
    tabConfigs.push(tabConfig);
  });
  return tabConfigs;
};

const getRelatedEntries = async (tabConfigs, data) => {
  const relatedEntries = new Map();
  for (const tabConfig of tabConfigs) {
    if (
      tabConfig.relationKey !== 'NONE' &&
      !relatedEntries.has(tabConfig.relationKey)
    ) {
      const loadedEntries = await loadEntries(tabConfig, data);
      relatedEntries.set(tabConfig.relationKey, loadedEntries);
    }
  }
  return relatedEntries;
};

const getMatchedEntriesMap = (relatedEntriesMap, tabsConfig) => {
  const matchedEntriesMap = new Map();
  relatedEntriesMap.forEach((entriesArray, relationKey) => {
    const tabs2matchArray = tabsConfig.filter(
      (config) => config.relationKey === relationKey
    );
    matchedEntriesMap.set(
      relationKey,
      matchEntriesToConstraints(entriesArray, tabs2matchArray)
    );
  });
  return matchedEntriesMap;
};

const getCompleteTabArray = (matchedEntriesMap, tabsConfig) => {
  const completeTabArray = [];
  tabsConfig.forEach((tabConfig) => {
    if (tabConfig.relationKey === 'NONE') {
      completeTabArray.push(tabConfig);
    } else {
      const matchedEntries = matchedEntriesMap
        .get(tabConfig.relationKey)
        .get(JSON.stringify(tabConfig.match));
      if (matchedEntries) {
        matchedEntries.forEach((matchedEntry) => {
          const newTabConfig = { ...tabConfig };
          newTabConfig.entry = matchedEntry;
          completeTabArray.push(newTabConfig);
        });
      }
    }
  });
  return completeTabArray;
};

/**
 * Creates an array with all tab configs for all found related entries
 *
 * @param {Array<object>} tabConfigs - Array of config for all tabs
 * @param {TabsConfig} data - Start config
 * @returns {Promise<Array>}
 */
const getTabArray = async (tabConfigs, data) => {
  const useRelation = !!tabConfigs.find(
    (config) => config.relationKey !== 'NONE'
  );
  if (!useRelation) {
    return tabConfigs;
  }
  const relatedEntriesMap = await getRelatedEntries(tabConfigs, data);
  const matchedEntriesMap = getMatchedEntriesMap(relatedEntriesMap, tabConfigs);
  return getCompleteTabArray(matchedEntriesMap, tabConfigs);
};

/**
 * Initializes the values needed in esb-tabs and adds it to the node
 *
 * @param {Array<object>} tabArray
 * @param {Node} node
 * @returns {void}
 */
const renderTabComponents = (tabArray, node) => {
  const tabsElement = document.createElement('esb-tabs');
  tabsElement.initialize(tabArray, `esbTabs__content_${counter}`);
  node.appendChild(tabsElement);
  counter += 1;
};

/**
 * Renders a presenter made up by a content section from the contentTemplate and a button from the buttonTemplate.
 * The buttons can hold an entry one relation away or the one given from start. The entry and parameters are applied
 * to the content template when the button is clicked.
 * Depending on which button is clicked the corresponding data is used to render content from the contentTemplate.
 *
 * @function renderTabs
 * @param {Element} node node to add block to
 * @param {TabsConfig} data block config
 */

const tabs = (node, data) => {
  filter.guard(node, data.if);
  getEntry(
    data,
    (entry) => {
      if (!entry && !data.fallback) {
        return;
      }
      if (!entry) {
        handlebars.run(node, data, data.fallback, null, false);
        return;
      }
      data.entry = entry;
      const tabConfig = getTabConfigs(data);
      getTabArray(tabConfig, data).then((tabArray) => {
        if (tabArray.length === 0) {
          if (!data.fallback) {
            return;
          }
          handlebars.run(node, data, data.fallback, null, false);
          return;
        }
        renderTabComponents(tabArray, node);
      });
    },
    false
  );
};

export default tabs;
