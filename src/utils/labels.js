import registry from 'blocks/registry';

export default (values, valueType = 'uri') => {
  const rdfutils = registry.get('rdfutils');
  const localize = registry.get('localize');
  const es = registry.get('entrystore');
  const cache = es.getCache();

  const val2choice = registry.get('itemstore_choices');
  const val2named = registry.get('blocks_named');

  const toLoad = {};
  const labels = {};
  const getLabel = (value) => {
    const named = val2named[value];
    const choice = val2choice[value];
    const entrySet = cache.getByResourceURI(value);
    if (named) {
      return localize(named);
    } else if (choice) {
      return localize(choice.label);
    } else if (entrySet.size > 0) {
      return rdfutils.getLabel(Array.from(entrySet)[0]);
    }

    return null;
  };
  values.forEach((value) => {
    if (valueType === 'uri') {
      const label = getLabel(value);
      if (label) {
        labels[value] = label;
      } else {
        toLoad[value] = true;
      }
    } else {
      labels[value] = value;
    }
  });
  const toLoadArr = Object.keys(toLoad);
  if (toLoadArr.length === 0) {
    return new Promise(resolve => resolve(labels));
  }

  return registry.get('entrystoreutil').loadEntriesByResourceURIs(toLoadArr, undefined, true)
    .then((entryarr) => {
      entryarr.forEach((entry) => {
        if (entry) {
          labels[entry.getResourceURI()] = rdfutils.getLabel(entry);
        }
      });
      return labels;
    });
};


export const rewrite = (label, colDef) => {
  if (!label) {
    return;
  }
  if (colDef.labelRegExp || colDef.labelTemplate) {
    const exploded = colDef.labelRegExp ? label.match(new RegExp(colDef.labelRegExp)) || [] : [];
    if (colDef.labelTemplate) {
      let val = colDef.labelTemplate;
      if (val.indexOf('${') === -1) {
        val += label;
      } else {
        if (val.indexOf('${1}') !== -1) {
          if (exploded.length > 1) {
            val = val.replace('${1}', exploded[1]);
          } else {
            val = val.replace('${1}', label);
          }
        }
        if (val.indexOf('${2}') !== -1) {
          val = val.replace('${2}', exploded[2]);
        }
        if (val.indexOf('${label}') !== -1) {
          val = val.replace('${label}', label);
        }
      }
      return val;
    } else if (exploded.length > 1) {
      return exploded[1];
    }
  }
  if (label === '__not') {
    return colDef.facetMissingLabel;
  }
  return label;
};
