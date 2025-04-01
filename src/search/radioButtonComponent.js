import filter from 'blocks/utils/filter';

/**
 * A radio button with label. When checked the named filter will be updated in registry
 *
 * @param {object} radioConfig
 * @param {{root: string, input: string, label: string}} radioConfig.className
 * @param {string} radioConfig.name
 * @param {string} radioConfig.id
 * @param {string} radioConfig.value
 * @param {string} radioConfig.label
 * @param {string} radioConfig.collectionName
 * @param {boolean} isDefaultOption
 * @param {Element} node
 */
export const radioButtonComponent = (radioConfig, isDefaultOption, node) => {
  const { className, name, id, value, label, collectionName } = radioConfig;
  const template = `
  <div class="esbRadioFilter__wrapper ${className.root}">
    <input
      type="radio"
      name="${name}"
      id="${id}"
      value="${value}"
      class="esbRadioFilter__button ${className.input}"
      ${isDefaultOption ? 'checked' : ''}>
    <label
      for="${id}"
      class="esbCheckboxFilter__label ${className.label}">${label}</label>
  </div>`;

  node.insertAdjacentHTML('beforeend', template);

  document.getElementById(id).addEventListener('change', (e) => {
    if (!e.target.checked) {
      return;
    }
    if (filter.has(collectionName, e.target.value)) {
      return;
    }
    if (isDefaultOption) {
      filter.remove({ group: collectionName });
    }
    filter.replace({ group: collectionName }, { group: collectionName, value: e.target.value });
  });
};
