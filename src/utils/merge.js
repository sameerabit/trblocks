/**
 * Check what type of merge operation should be used
 *
 * @param {object|Array} collector
 * @param {object|Array} provider
 * @returns {string}
 * @private
 */
const _getTypeOfMerge = (collector, provider) => {
  if (!collector || !provider || typeof collector !== typeof provider) {
    return 'NO_MERGE';
  }
  if (Array.isArray(collector) && Array.isArray(provider)) {
    if (provider.find((element) => element.name)) return 'NAME_MERGE';
    return 'CONCAT';
  }
  if (typeof collector === 'object' && collector !== null && typeof provider === 'object' && provider !== null) {
    return 'OBJECT_DEEP_MERGE';
  }
  return 'NO_MERGE';
};

/**
 * Deep merge of two objects or concatenation of arrays.
 * If two objects are given the latter values are merged into te first object.
 * If there are subobjects the procedure are repeated for those.
 * If a key is prefixed with a ! the value is overwritten rather than merged.
 *
 * @param {object|Array} collector
 * @param {object|Array} provider
 * @returns {object|Array}
 */
const merge = (collector, provider) => {
  const mergeType = _getTypeOfMerge(collector, provider);
  if (mergeType === 'NO_MERGE') {
    return provider;
  }
  if (mergeType === 'CONCAT') {
    return collector.concat(provider);
  }
  if (mergeType === 'NAME_MERGE') {
    provider.forEach((providerObject) => {
      let existingNamedDef = collector.find((collectorObject) => collectorObject.name === providerObject.name);
      if (existingNamedDef) {
        existingNamedDef = merge(existingNamedDef, providerObject);
      } else {
        collector.push(providerObject);
      }
    });
    return collector;
  }
  if (mergeType === 'OBJECT_DEEP_MERGE') {
    Object.keys(provider).forEach((providerKey) => {
      if (providerKey.startsWith('!')) {
        const overrideKey = providerKey.replace('!', '');
        collector[overrideKey] = provider[providerKey]; // Override if starts with !
        return;
      }
      if (!collector.hasOwnProperty(providerKey)) {
        collector[providerKey] = provider[providerKey]; // Add if not present
        return;
      }
      collector[providerKey] = merge(collector[providerKey], provider[providerKey]);
    });
    return collector;
  }
};

/**
 * Merge function specific for Blocks configurations
 *
 * @param {...*} configurationObjects
 * @returns {object} merged configurations
 */
const mergeConfig = (...configurationObjects) => {
  let mergedConfig;
  configurationObjects.forEach((confObject) => {
    mergedConfig = merge(mergedConfig, confObject);
  });
  return mergedConfig;
};

export default mergeConfig;
