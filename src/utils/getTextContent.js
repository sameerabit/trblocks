import template from 'lodash-es/template';
import escape from 'lodash-es/escape';
import utils from '@entryscape/rdforms/src/utils';
import registry from 'blocks/registry';

const rdfutils = registry.get('rdfutils');
const special = {
  label(entry) {
    const label = rdfutils.getLabel(entry);
    return label || undefined;
  },
  description(entry) {
    const desc = rdfutils.getDescription(entry);
    return desc || undefined;
  },
};
const varRegexp = /\$\{([^\s\:\}]*)(?:\:([^\s\:\}]+))?\}/g; // eslint-disable-line no-useless-escape

const getLocalizedPropertyValue = (entry, property) => {
  const lang2value = utils.getLocalizedMap(entry.getAllMetadata(), entry.getResourceURI(), [property]);
  const localize = registry.get('localize');
  const localizedValue = localize(lang2value);
  return localizedValue;
};

export default function (data, entry) {
  if (data.content || data.altcontent) {
    let content = data.content || data.altcontent;
    const vars = (content.match(varRegexp) || []).map(v => v.substr(2, v.length - 3));
    const defaultProj = {};
    const vals = {};
    const mapping = {};
    vars.forEach((v) => {
      let nv = v;
      let fallback = '';
      const arr = v.split('|');
      if (arr.length > 1) {
        nv = arr[0];
        fallback = arr[1];
      }
      if (special[nv]) {
        const specialval = special[nv](entry);
        vals[nv] = specialval ? escape(specialval) : fallback;
      } else {
        const vp = nv.replace(':', '_');
        defaultProj[vp] = fallback;
        mapping[vp] = nv;
        content = content.replace(new RegExp(`\\\${${v.replace('|', '\\|')}}`, 'g'), `\${${vp}}`);
      }
    });
    const pr = entry.getAllMetadata().projection(entry.getResourceURI(), mapping, 'statement');
    Object.keys(mapping).forEach((key) => {
      const stmts = pr[`*${key}`];
      const lmap = {};
      if (stmts) {
        stmts.forEach((stmt) => {
          if (stmt.getLanguage()) {
            lmap[stmt.getLanguage()] = stmt.getValue();
          }
        });
      }
      if (Object.keys(lmap).length > 0) {
        pr[key] = escape(utils.getLocalizedValue(lmap).value);
      }
    });
    const obj = { ...vals, ...defaultProj, ...pr };

    return template(content)(obj);
  }
  if (data.property) {
    const localizedValue = getLocalizedPropertyValue(entry, data.property);
    return escape(localizedValue);
  }
  const label = rdfutils.getLabel(entry);
  return label ? escape(label) : undefined;
}
