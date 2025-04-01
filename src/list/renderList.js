import DOMUtil from 'blocks/utils/htmlUtil';
import config from 'blocks/config/config';
import params from 'blocks/boot/params';
import getEntry from '../utils/getEntry';
import List from './List';

export default (node, data, items) => {
  if (data.rowhead || data.rowexpand || data.listempty || data.listhead || data.listbody || data.listplaceholder) {
    data.templates = data.templates || {};
    data.templates.rowhead = data.rowhead;
    data.templates.rowexpand = data.rowexpand;
    data.templates.listempty = data.listempty;
    data.templates.listhead = data.listhead;
    data.templates.listbody = data.listbody;
    data.templates.listplaceholder = data.listplaceholder;
  }

  const entryId = data.entry || config.urlParams.entry || config.econfig.entry;
  const uri = data.uri || config.urlParams.uri || config.econfig.uri;
  const lookup = data.lookup || config.urlParams.lookup || config.econfig.lookup;
  if (entryId != null || uri != null || lookup != null) {
    getEntry(data, (entry) => {
      if (entry && entry.getAllMetadata().find(entry.getResourceURI(), data.property).length > 0) {
        data.headless = true;
        const sl = new List({
          conf: data,
          itemstore: items,
          entry,
        }, DOMUtil.create('div'));
        node.appendChild(sl.domNode);
        sl.search();
      } else {
        // TODO write "Nothing to show" somehow?
      }
    }, false);
  } else {
    // This code never works right now due to missing entry
    // TODO investigate
    let contextId = data.context || params.getUrlParams().context || config.econfig.context;
    if (typeof contextId === 'number') {
      contextId = `${contextId}`;
    }
    const sl = new List({
      conf: data,
      itemstore: items,
      contextId,
    }, DOMUtil.create('div'));
    node.appendChild(sl.domNode);
    sl.search();
  }
};
