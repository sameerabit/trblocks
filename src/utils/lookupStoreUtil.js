import registry from 'blocks/registry';

/**
 * Get instance of LookupStore after ensuring context entry is loaded.
 * Needed as long as the calback function is synchronous.
 *
 * @param {Entry} entry
 * @return {Promise<LookupStorre>}
 */
const getLookupStore = async (entry) => {
  const entrystore = registry.get('entrystore');
  const contextURI = entry.getContext().getEntryURI();
  await entrystore.getEntry(contextURI); // TODO! remove pre loading context when lookupStore handles async callback
  return registry.get('lookupstore');
};

export default getLookupStore;
