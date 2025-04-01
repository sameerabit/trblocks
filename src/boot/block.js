import config from 'blocks/config/config';
import merge from 'blocks/utils/merge';
import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import { initCollectionListeners } from 'blocks/utils/collectionUtil';

import renderEntryMetadata from 'blocks/metadata/renderEntryMetadata';
import renderSearchList from 'blocks/search/renderSearchList';
import renderSimpleSearch from 'blocks/search/renderSimpleSearch';
import renderRangeSearch from 'blocks/search/renderRangeSearch';
import renderMultiSearch from 'blocks/search/renderMultiSearch';
import renderSearchFilter from 'blocks/search/renderSearchFilter';
import renderClear from 'blocks/search/renderClear';
import renderFacets from 'blocks/search/renderFacets';
import renderList from 'blocks/list/renderList';
import renderExport from 'blocks/list/renderExport';
import renderEntryLink from 'blocks/text/renderEntryLink';
import renderBack from 'blocks/text/renderBack';
import renderText from 'blocks/text/renderText';
import renderDate from 'blocks/text/renderDate';
import renderTemplate from 'blocks/text/renderTemplate';
import renderResults from 'blocks/search/renderResults';
import renderCollectionText from 'blocks/text/renderCollectionText';
import renderImage from 'blocks/image/renderImage';
import renderIcon from 'blocks/icon/renderIcon';
import renderSlider from 'blocks/image/renderSlider';
import renderTabs from 'blocks/tabs/renderTabs';
import renderMap from 'blocks/graphics/map/renderMap';
import renderVisualization from 'blocks/graphics/renderVisualization';
import renderChart from 'blocks/graphics/chart/renderChart';
import renderTable from 'blocks/graphics/renderTable';
import renderJSON from 'blocks/text/renderJSON';
import renderError from 'blocks/error/renderError';
import renderHierarchy from 'blocks/graphics/hierarchy/renderHierarchy';
import renderExpand from 'blocks/layout/renderExpand';
import renderMediaQuery from 'blocks/layout/renderMediaQuery';
import renderFilter from 'blocks/search/renderFilter';
import renderSort from 'blocks/search/renderSort';
import renderLimit from 'blocks/search/renderLimit';
import renderCheckboxFilter from 'blocks/search/renderCheckboxFilter';
import renderRadioButtonFilter from 'blocks/search/renderRadioButtonFilter';
import renderStateControl from 'blocks/stateControl/renderStateControl';
import renderDialog from 'blocks/modals/renderDialog';
import renderPopover from 'blocks/modals/renderPopover';
import renderJSONLD from 'blocks/head/renderJSONLD';
import renderClick from 'blocks/event/renderClick';
import getEntry from 'blocks/utils/getEntry';
import handleConfig from './handleConfig';
import error from './error';

const Block = {};

const block2function = {
  view: renderEntryMetadata,
  list: renderList,
  export: renderExport,
  link: renderEntryLink,
  back: renderBack,
  text: renderText,
  date: renderDate,
  template: renderTemplate,
  image: renderImage,
  icon: renderIcon,
  slider: renderSlider,
  tabs: renderTabs,
  facets: renderFacets,
  simpleSearch: renderSimpleSearch,
  multiSearch: renderMultiSearch,
  searchList: renderSearchList,
  searchFilter: renderSearchFilter,
  rangeSearch: renderRangeSearch,
  sort: renderSort,
  limit: renderLimit,
  clear: renderClear,
  results: renderResults,
  filterResults: renderFilter,
  collectionText: renderCollectionText,
  map: renderMap,
  geoMap: renderMap,
  visualization: renderVisualization,
  chart: renderChart,
  table: renderTable,
  json: renderJSON,
  hierarchy: renderHierarchy,
  config: handleConfig,
  expand: renderExpand,
  mediaQuery: renderMediaQuery,
  click: renderClick,
  checkboxFilter: renderCheckboxFilter,
  radioButtonFilter: renderRadioButtonFilter,
  stateControl: renderStateControl,
  dialog: renderDialog,
  popover: renderPopover,
  jsonld: renderJSONLD,
  viewMetadata: renderEntryMetadata, // deprecated, use view
  search: renderSearchList, // deprecated, use searchList
  preload: handleConfig, // deprecated, use config
  error: renderError,
  helloworld(node, data) {
    node.innerHTML = data.message || 'Hello world!';
  },
};

Block.synchronousList = [];
(config.econfig.blocks || []).forEach((bc) => {
  if (bc.extends && block2function[bc.extends]) {
    block2function[bc.block] = (node, data, items) => {
      block2function[bc.extends](node, merge({}, bc, data), items);
    };
  } else if (bc.run) {
    if (bc.loadEntry) {
      block2function[bc.block] = (node, data, items) => {
        getEntry(data, (entry) => {
          bc.run(node, data, items, entry);
        });
      };
    } else {
      block2function[bc.block] = bc.run;
      if (bc.synchronous) {
        Block.synchronousList.push(bc.block);
      }
    }
  }
});

Block.list = Object.keys(block2function);
Block.run = (block, node, data) => {
  const items = registry.get('itemstore');
  if (data.error) {
    error(node, data, items);
  } else {
    const initializeBlock = block2function[block || ''];
    if (initializeBlock) {
      // Return value in case run method is synchronous and block is executed within template
      return initializeBlock(node, data, items);
    }
  }
  return undefined;
};

Block.init = (extraConfig) => {
  if (config.econfig.spa) {
    config.initConfig(extraConfig);
    params.init();
    initCollectionListeners();
  }
  // Set the default to always load public entries
  registry.get('entrystoreutil').loadOnlyPublicEntries(true);
  Block.run('config', null, config.econfig);
  if (config.econfig && config.econfig.init) {
    config.econfig.init(registry);
  }

  config.nodes.forEach((nobj) => {
    Block.run(nobj.data.block || nobj.data.component, nobj.node, nobj.data);
  });

  if (window.customElements) {
    Object.keys(block2function).forEach((block) => {
      const func = block2function[block];
      const C = class extends HTMLElement {
        constructor() {
          super();
          this.classList.add('entryscape');
          const items = registry.get('itemstore');
          const data = {};
          this.attributes.forEach((attr) => {
            data[attr.localName] = attr.value;
          });
          const inner = this.innerHTML;
          if (block === 'template' && !data.template && !data.htemplate && inner) {
            data.template = inner;
          }
          func(this, data, items);
        }
      };
      const custName = `esb-${block.toLowerCase()}`;
      if (!customElements.get(custName)) {
        customElements.define(custName, C);
      }
    });
  }

  // Make sure collections are initialized.
  if (!registry.get('blocks_collections')) {
    registry.set('blocks_collections', []);
  }
};

Block.clear = () => {
  registry.clearNonPersistantKeys();
  config.nodes.forEach(({ node }) => {
    node.innerHTML = '';
  });
};

Block.mount = Block.init;
Block.unMount = Block.clear;

Block.registry = registry;

export default Block;
