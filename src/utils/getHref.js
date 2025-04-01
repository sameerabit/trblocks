import params from 'blocks/boot/params';
import registry from 'blocks/registry';
import template from 'lodash-es/template';

export const transformURI = (uri, mask, pattern, obj) => {
  if (mask) {
    const masked = uri.match(new RegExp(mask));
    if (masked) {
      if (pattern) {
        const _pattern = pattern.replace('${1', '${_1').replace('${2', '${_2');
        const o = obj || {};
        masked.forEach((v, i) => {
          o[`_${i}`] = v;
        });
        return template(_pattern)(o);
      }
      return masked[1];
    }
  } else if (pattern && obj) {
    return template(pattern)(obj);
  }
  return undefined;
};

export default (data, entry) => {
  const pobj = {};
  const clicks = registry.get('clicks');
  const click = (data.namedclick ? clicks[data.namedclick] : data.click) || '';
  if (click && click.indexOf('esb:') === 0) {
    const pattern = click.substr(4);
    const mask = data.clickmask;
    return transformURI(entry.getResourceURI(), mask, pattern, {
      entry: entry.getId(),
      context: entry.getContext().getId(),
      uri: entry.getResourceURI(),
    });
  }
  if (data.clickkey && data.clickvalue) {
    if (data.clickentry) {
      pobj.entry = entry.getId();
      pobj.context = entry.getContext().getId();
    }
    let mdValue;
    switch (data.clickvalue) {
      case 'resource':
        pobj[data.clickkey] = entry.getResourceURI();
        break;
      default:
        mdValue = entry.getAllMetadata().findFirstValue(entry.getResourceURI(), data.clickvalue);
        if (mdValue && mdValue !== '') {
          pobj[data.clickkey] = mdValue;
        }
    }
  } else {
    pobj.entry = entry.getId();
    pobj.context = entry.getContext().getId();
  }
  return params.getLink(click, pobj);
};
