import DOMUtil from 'blocks/utils/htmlUtil';
import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';
import utils from './utils';

/**
 * Renders a checkbox filter.
 * Selected values will be used by the "search" component (renderSearchList) as constraints.
 *
 * Parameters in block config:
 * collection - the collection containing information about which property the checkBox query should use
 * label - used for the checkbox label
 * checkboxType - hould the checkbox add or remove the collection from the query. Possible values are add or remove.
 *                Default is add.
 * class - an optional class can be added to the checkbox and label element
 *
 * Parameters in collection config:
 * type, name, property, nodetype, values, related and modifier
 *
 * Parameters in global config:
 * baseFilter - will include the named collection in the query without including it in the url. Will affect if the
 *              checkbox is checked or not when the filter is updated the first time.
 */

export default (node, data) => {
  const checkboxType = data.checkboxType ? data.checkboxType : 'add';

  node.classList.add('esbCheckboxFilter');
  const checkboxWrapper = DOMUtil.create('div', { class: 'form-check' }, node);
  const checkBox = DOMUtil.create('input', utils.commonAttrs({
    type: 'checkbox',
    class: 'esbCheckboxFilter__checkbox form-check-input ' + (data.class ? data.class : ''),
    id: data.collection,
  }, data), checkboxWrapper);

  const checkboxLabel = DOMUtil.create('label', utils.commonAttrs({
    for: data.collection,
    class: 'esbCheckboxFilter__label form-check-label ' + (data.class ? data.class : ''),
  }, data), checkboxWrapper);
  checkboxLabel.innerText = data.label;

  checkBox.onclick = (e) => {
    const checked = e.target.checked;
    if ((checked && checkboxType === 'add') || (!checked && checkboxType === 'remove')) {
      filter.add({ group: data.collection, value: 'check' });
    } else {
      filter.remove({ group: data.collection, value: 'check' });
    }
  };

  registry.onInit('blocks_search_filter').then(() => {
    const queryActive = filter.has(data.collection);
    checkBox.checked = (queryActive && checkboxType === 'add') || (!queryActive && checkboxType === 'remove');
  });
};

