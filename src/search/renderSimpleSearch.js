import DOMUtil from 'blocks/utils/htmlUtil';
import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';
import utils from './utils';

export default (node, data) => {
  /**
   * Renders a search input field. The typed search term will be used as a constraint by the
   * search component.
   */

  if (typeof data.width !== 'undefined') {
    node.style.width = data.width;
  }
  node.classList.add('block_searchInput');
  let t;
  let term;
  let ignoreUpdate = false;
  const minimumSearchLength = registry.get('blocks_minimumSearchLength') || 3;

  const input = DOMUtil.create('input', utils.commonAttrs({ type: 'text', class: 'form-control' }, data));
  const error = DOMUtil.create('div', { innerHTML: utils.invalidSearchStringMessage(data), class: 'esbSearchError' });

  let inputgroup;
  if (data.formGroup || data.searchButton) {
    inputgroup = DOMUtil.create('span', { class: 'input-group' });
    node.appendChild(inputgroup);
    inputgroup.appendChild(input);
    node.appendChild(error);
  } else {
    node.appendChild(input);
    node.appendChild(error);
  }
  node.classList.add('esbSearchErrorNotPresent');

  const searchTriggered = () => {
    let newTerm = input.value;
    newTerm = newTerm.toLowerCase().trim();
    if (term === newTerm || (term === undefined && newTerm === '')) {
      return;
    }
    if (newTerm !== '' && newTerm.length < minimumSearchLength) {
      return;
    }
    newTerm = newTerm === undefined || newTerm.length < minimumSearchLength ? undefined :
      { value: newTerm, group: data.collection || 'term' };
    ignoreUpdate = true;
    filter.replace(!term ? undefined : { group: data.collection, value: term }, newTerm);
    term = newTerm;
  };
  if (data.searchButton) {
    const inputGroupButtonEl = DOMUtil.create('span', { class: 'input-group-btn input-group-append' });
    inputgroup.appendChild(inputGroupButtonEl);
    const button = DOMUtil.create('button', { class: 'btn btn-secondary',
      'aria-label': data.searchButtonLabel || 'Search' }, inputGroupButtonEl);
    DOMUtil.create('span', { 'aria-hidden': true, class: 'fas fa-search' }, button);
    button.onclick = searchTriggered;
  }
  input.onkeyup = () => {
    if (!utils.checkValidSearchString(input.value, data)) {
      node.classList.remove('esbSearchErrorNotPresent');
      node.classList.add('esbSearchErrorPresent');
      return;
    }
    node.classList.add('esbSearchErrorNotPresent');
    node.classList.remove('esbSearchErrorPresent');

    if (t != null) {
      clearTimeout(t);
    }
    t = setTimeout(searchTriggered, 300);
  };
  registry.onChange('blocks_search_filter', (filters) => {
    // If the simpleSearch caused the change itself moments before
    if (ignoreUpdate) {
      ignoreUpdate = false;
      return;
    }
    let newValue = '';
    const newValueArr = filters[data.collection || 'term'];
    if (newValueArr && newValueArr.length > 0) {
      newValue = newValueArr[0].value;
    }
    const existingValue = input.value;

    if (newValue !== existingValue) {
      input.value = newValue;
      term = newValue;
    }
  }, true);
};
