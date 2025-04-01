import { namespaces } from '@entryscape/rdfjson';
import registry from 'blocks/registry';

const optionsFromFacet = (facet, collection) => {
  const sourceOptions = collection.options;
  // Map between value and count of hits.
  const val2count = {};
  facet.values.forEach((v) => {
    val2count[v.name] = v.count;
  });
  const options = [];
  let otherOption;
  // For each option create an instance in the source and list with correct occurence.
  sourceOptions.forEach((option) => {
    if (!option.values) {
      otherOption = { ...option };
      return;
    }
    let occurence = 0;
    option.values.forEach((v) => {
      if (val2count[v] !== undefined) {
        occurence += val2count[v];
        delete val2count[v];
      }
    });
    if (occurence > 0) {
      options.push({
        label: option.label,
        value: option.value,
        values: option.values,
        group: collection.name,
        occurence,
      });
    }
  });
  // Take care of the "other" option, i.e. the those values that where not matched in predefined options
  if (otherOption) {
    let occurence = 0;
    otherOption.values = Object.keys(val2count).filter((value) => value !== '__not');
    otherOption.values.forEach((val) => {
      occurence += val2count[val];
    });
    if (occurence > 0) {
      options.push({
        label: otherOption.label,
        value: otherOption.value,
        values: otherOption.values,
        group: collection.name,
        occurence,
        other: true, // Mark this so we can disallow adding it to the page parameters, since that query requires another query to be done first.
      });
    }
  }
  if (val2count.__not) {
    options.push({
      label: collection.facetMissingLabel,
      value: '__not',
      values: ['__not'],
      group: collection.name,
      occurence: val2count.__not,
      facetMissing: true,
    });
  }
  options.sort((a, b) => ((a.other || a.facetMissing )? 1 : (a.occurence < b.occurence ? 1 : -1)));
  return options;
};

const findOption = (collection, value) => collection.options.find(option => option.value === value);

const constraintValuesFromOptions = (collection, optionsByValue) => {
  if (collection.options) {
    const newValues = [];
    optionsByValue.forEach((optionValue) => {
      const option = findOption(collection, optionValue);
      // No way to handle the "other" option since it relies on a previous search for the values.
      if (option && option.values) {
        option.values.forEach((v) => {
          newValues.push(v);
        });
      }
    });
    return newValues;
  }
  return vals;
};

const labelFromOptions = (property, value) => {
  const expandedProperty = namespaces.expand(property);
  const cols = registry.get('blocks_collections');
  if (cols) {
    const col = cols.find(c => c.options && c.property
      && namespaces.expand(c.property) === expandedProperty);
    if (col) {
      const expandedValue = col.nodetype === 'uri' ? namespaces.expand(value) : value;
      const otherOption = (col.options).find(o => o.value === '__other');
      const matchedOption = (col.options).find(o => o.values && o.values.indexOf(expandedValue) >= 0);
      if (matchedOption) {
        return matchedOption;
      }
      return otherOption;
    }
  }
  return undefined;
};

export default {
  optionsFromFacet,
  constraintValuesFromOptions,
  labelFromOptions,
};
