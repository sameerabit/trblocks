import DOMUtil from 'blocks/utils/htmlUtil';
import params from 'blocks/boot/params';
import registry from 'blocks/registry';
import List from 'blocks/list/List';
import getEntry from 'blocks/utils/getEntry';
import config from 'blocks/config/config';
import jquery from 'jquery';
import { blocksState } from 'blocks/utils/stateUtil';
import { isEqual } from 'lodash-es';

export default (node, data, items) => {
  data.state = blocksState.getState();
  if (data.class) {
    DOMUtil.addClass(node, data.class);
  }

  if (data.rowhead || data.rowexpand || data.listempty || data.listhead || data.listbody || data.listplaceholder) {
    data.templates = data.templates || {};
    data.templates.rowhead = data.rowhead;
    data.templates.rowexpand = data.rowexpand;
    data.templates.listempty = data.listempty;
    data.templates.listhead = data.listhead;
    data.templates.listbody = data.listbody;
    data.templates.listplaceholder = data.listplaceholder;
  }

  const sl = new List({
    block: 'searchList',
    conf: data,
    itemstore: items,
    includeHead: !data.headless,
  }, DOMUtil.create('div'));
  node.appendChild(sl.domNode);
  if (!sl.includeHead) {
    jquery(sl.domNode).find('.panel').removeClass('panel');
    sl.domNode.classList.add('headless');
  }

  const detectContext = () => {
    sl.contextId = data.context || params.getUrlParams().context || config.econfig.context;
    if (typeof sl.contextId === 'number') {
      sl.contextId = `${sl.contextId}`;
    }
  };

  let visible = !(data.visible === false || data.visible === 'false');
  if (!visible) {
    node.style.display = 'none';
  }
  const updateSearch = () => {
    if (visible === false || visible === 'false') {
      return;
    }
    const filter = registry.get('blocks_search_filter');
    detectContext();
    if (filter.term) {
      sl.search({}); // Provided via the filter filter.constraint method.
    } else {
      sl.search({ term: '*' });
    }
  };

  // Listen on signal, if enabled, then do another search, otherwise hide.
  registry.onChange('searchList-open', (searchListName) => {
    // We are sending a signal that the current searchList should be open
    // Current is set via "define".
    if (data.define === searchListName) {
      if (!visible) {
        visible = true;
        node.style.display = '';
        updateSearch();
      }
    } else {
      visible = false;
      node.style.display = 'none';
    }
  });
  registry.onChange('blocks_search_filter', updateSearch);
};
