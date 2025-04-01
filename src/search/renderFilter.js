import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';
import utils from './utils';

export default (node, data) => {
  node.classList.add('esbFilterResults');
  const collections = registry.get('blocks_collections');
  const name2col = {};
  collections.forEach((col) => {
    name2col[col.name] = col;
  });

  registry.onChange(
    'blocks_search_filter',
    (filters) => {
      node.innerText = '';

      const renderFilter = (item) => {
        const box = document.createElement('div');
        if (data.groupLabel && item.group && item.group !== 'term') {
          const groupLabel = document.createElement('div');
          groupLabel.classList.add('esbFilterResults__group');
          groupLabel.innerText = `${name2col[item.group].label}:`;
          box.appendChild(groupLabel);
        }
        const label = document.createElement('div');
        const button = document.createElement('button');
        label.innerText = item.label || decodeURIComponent(item.value);
        box.classList.add('esbFilterResults__filter');
        label.classList.add('esbFilterResults__label');
        button.classList.add('esbFilterResults__removeButton');
        box.appendChild(label);
        box.appendChild(button);
        button.onclick = () => filter.remove(item);
        node.appendChild(box);
      };
      Object.keys(filters).forEach((group) => {
        utils.setValues(filters, group, renderFilter);
      });
    },
    true
  );
};
