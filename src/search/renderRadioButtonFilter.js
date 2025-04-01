import registry from 'blocks/registry';
import { radioButtonComponent } from 'blocks/search/radioButtonComponent';

let counter = 1;

/**
 * Adds default class values and the radiobutton attributes
 *
 * @param {object} data
 * @param {string} data.collection
 * @param {string} [data.class]
 * @param {object} option
 * @param {string} option.name
 * @param {string} option.label
 * @param {number} idSuffix
 * @returns {{name, label, id, className:{input, root, label}, value, collectionName}}
 */
const getRadioConfig = (data, option, idSuffix) => {
  const { name, label } = option;
  const collectionName = data.collection;
  return {
    className: {
      root: data.class || 'form-check-inline',
      input: data.class || 'form-check-input',
      label: data.class || 'form-check-label',
    },
    name: `${collectionName}_${idSuffix}`,
    id: `${name}_${idSuffix}`,
    value: name,
    label,
    collectionName,
  };
};

/**
 * Sets active radio button depending on if it is active in the filter and if that active filter-value corresponds to
 * a valid radiobutton. Fallback to the first radiobutton.
 *
 * @param {Array<object>} searchFilter
 * @param {string} collectionName
 * @param {number} idSuffix
 * @param {Element} node
 */
const setCheckedRadioButton = (searchFilter, collectionName, idSuffix, node) => {
  const activeRadioOption = searchFilter[collectionName]?.find((filterItem) => filterItem.group === collectionName);
  if (activeRadioOption) {
    const activeRadioValue = activeRadioOption.value;
    const activeRadioId = `${activeRadioValue}_${idSuffix}`;
    const activeRadioInput = document.getElementById(activeRadioId);
    if (activeRadioInput) {
      activeRadioInput.checked = true;
      return;
    }
  }
  const defaultRadio = node.querySelector('input');
  defaultRadio.checked = true;
};

/**
 * Renders a radio button filter.
 * Selected value will be used by the "search" component (renderSearchList) as constraints.
 * The global parameter - baseFilter, can be used if another option than first should be default.
 *
 * @function renderRadioButtonFilter
 * @param {Element} node - Node to add the icon/icons to
 * @param {object} data - Block config
 * @param {string} data.collection - collection containing options/query's and labels for the radio button control
 * @param {string} [data.class] - a class can be added to replace the bootstrap classes on input, label and wrapper
 */

const radiobuttonFilter = (node, data) => {
  const idSuffix = counter;
  counter += 1;
  const collectionName = data.collection;
  if (!collectionName) {
    console.error('Mandatory property collection is missing in radioButton block configuration');
    return;
  }
  const radioCollection = registry.get(`blocks_collection_${collectionName}`);
  if (!radioCollection?.options) {
    console.error(`Mandatory collection declaration for ${collectionName} is missing`);
    return;
  }
  node.classList.add('esbRadioFilter');
  radioCollection.options.forEach((option, index) => {
    const radioConfig = getRadioConfig(data, option, idSuffix);
    const defaultOption = index === 0;
    radioButtonComponent(radioConfig, defaultOption, node);
  });

  registry.onInit('blocks_search_filter').then((searchFilter) => {
    setCheckedRadioButton(searchFilter, collectionName, idSuffix, node);
    registry.onChange('blocks_search_filter', (newSearchFilter) => {
      setCheckedRadioButton(newSearchFilter, collectionName, idSuffix, node);
    });
  });
};

export default radiobuttonFilter;
