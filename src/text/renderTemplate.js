import registry from 'blocks/registry';
import filter from 'blocks/utils/filter';
import handlebars from 'blocks/boot/handlebars';
import getEntry from 'blocks/utils/getEntry';
import htmlUtil from 'blocks/utils/htmlUtil';
import jquery from 'jquery';

const loadDeps = async (data, entry) => {
  const cache = entry.getEntryStore().getCache();
  const dps = (data.dependencyproperties ?
    data.dependencyproperties.split(',') : []).map(prop => prop.trim());
  const toLoad = {};
  const md = entry.getAllMetadata();
  const s = entry.getResourceURI();
  dps.forEach((dp) => {
    md.find(s, dp).forEach((stmt) => {
      if (stmt.getType() === 'uri') {
        if (cache.getByResourceURI(stmt.getValue()).size === 0) {
          toLoad[stmt.getValue()] = true;
        }
      }
    });
  });
  const toLoadArr = Object.keys(toLoad);
  if (toLoadArr.length !== 0) {
    await registry.get('entrystoreutil').loadEntriesByResourceURIs(toLoadArr, undefined, true);
  }
};


let counter = 0;
export default (node, data) => {
  filter.guard(node, data.if);
  data.id = `esb_t_${counter}_`;
  counter += 1;
  const g = () => {
    const callHandlebarsAfterDeps = (entry) => {
      // Avoid asynchronous as far as possible to
      // not cause problem with stacking in handlebars rendering
      if (data.dependencyproperties) {
        loadDeps(data, entry).then(() => {
          handlebars.run(node, data, null, entry);
        });
      } else {
        handlebars.run(node, data, null, entry);
      }
    };
    const f = () => {
      if (data.class) {
        htmlUtil.addClass(node, data.class);
      }
      getEntry(data, callHandlebarsAfterDeps);
    };
    if (data.tab) {
      const t = document.getElementById(data.tab);
      if (t.classList.contains('active')) {
        f();
      } else {
        let uninitied = true;
        jquery(t).on('show.bs.tab', () => {
          if (uninitied) {
            f();
            uninitied = false;
          }
        });
      }
    } else {
      f();
    }
  };
  if (data.before) {
    handlebars.run(node, data, data.progressTemplate);

    getEntry(data, (entry) => {
      data.entry = entry;
      data.before(node, data, registry).then(g);
    });
  } else {
    g();
  }
};
