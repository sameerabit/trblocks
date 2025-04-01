import DOMUtil from 'blocks/utils/htmlUtil';
import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';
import utils from './utils';

const toRangeValue = (data, value) => ((data.to === 'true' || data.to) ?
  { value: `to:${value}`, group: data.collection } :
  { value: `from:${value}`, group: data.collection });

const extractRangeValue = (data, arr) => {
  const start = (data.to === 'true' || data.to) ? 'to:' : 'from:';
  const obj = arr.find(v => v.value.startsWith(start));
  return obj ? obj.value.substr(start.length) : '';
};

export default (node, data) => {
  /**
   * Renders a ranged input field.
   */

  node.classList.add('block_searchInput');
  let term = '';
  let lock = false;

  const input = DOMUtil.create('input', utils.commonAttrs({ type: 'text', class: 'form-control' }, data), node);
  node.appendChild(input);

  let t;
  const searchTriggered = () => {
    t = undefined;
    const newTerm = input.value.toLowerCase();
    if (newTerm !== '' && data.pattern && !(new RegExp(data.pattern).test(newTerm))) {
      return;
    }
    if (term === newTerm) {
      return;
    }

    lock = true;
    filter.replace(term ? toRangeValue(data, term) : undefined, newTerm ? toRangeValue(data, newTerm) : undefined);
    term = newTerm;
    lock = false;
  };
  input.onkeyup = () => {
    if (t != null) {
      clearTimeout(t);
    }
    t = setTimeout(searchTriggered, 300);
  };
  registry.onChange('blocks_search_filter', (filters) => {
    if (lock) {
      // If the filter is itself making the change
      return;
    }
    lock = true;
    let newValue = '';
    const newValueArr = filters[data.collection];
    if (newValueArr && newValueArr.length > 0) {
      newValue = extractRangeValue(data, newValueArr);
    }
    const existingValue = input.value;

    if (newValue !== existingValue) {
      input.value = newValue;
      term = newValue;
    }
    lock = false;
  }, true);
};
