import getEntry from 'blocks/utils/getEntry';
import { getBoolean } from 'blocks/utils/configUtil';
import registry from 'blocks/registry';

/**
 * Renders a script tag and adds it to the head of the page
 *
 * @param {Element} node - Not used, node to add block to
 * @param {object} data - Block config
 * @param {string} [data.recursive] - Comma-separated list of profile to traverse e.g. 'dcat,foaf:knows'
 * @param {boolean} [data.repository] - If true the parameter will be added and traversal will ignore context boundary
 * @returns {void}
 */
const renderJSONLD = (node, data) => {
  getEntry(data, async (entry) => {
    if (!entry) return;
    const metadataURI = entry.getEntryInfo().getMetadataURI();
    const recursive = data.recursive ? `recursive=${data.recursive}&` : '';
    const repository = getBoolean(data.repository, false) ? `repository&` : '';
    try {
      const es = registry.get('entrystore');
      const queryUrl = `${metadataURI}?${recursive}${repository}format=application/ld+json`;
      const response = await es.getREST().get(queryUrl, 'application/json', false, undefined);
      const structuredDataText = JSON.stringify(response);
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.textContent = structuredDataText;
      document.head.appendChild(script);
    } catch (error) {
      console.error(`Download error: ${error.message}`);
    }
  });
};
export default renderJSONLD;
