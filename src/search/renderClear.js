import filter from 'blocks/utils/filter';
import registry from 'blocks/registry';

export default (node, data) => {
  node.parentElement.onclick = () => {
    filter.setAll();
  };
  node.parentElement.classList.add('entryscape');
  if (data.empty) {
    const updateEmpty = () => {
      if (filter.isEmpty()) {
        switch (data.empty) {
          case 'hide':
            node.parentElement.style.visibility = 'hidden';
            break;
          case 'disable':
            node.parentElement.setAttribute('disabled', true);
            break;
          case 'remove':
            node.parentElement.style.display = 'none';
            break;
          default:
            node.parentElement.classList.add(data.empty);
        }
      } else {
        switch (data.empty) {
          case 'hide':
            node.parentElement.style.visibility = '';
            break;
          case 'disable':
            node.parentElement.removeAttribute('disabled');
            break;
          case 'remove':
            node.parentElement.style.display = '';
            break;
          default:
            node.parentElement.classList.remove(data.empty);
        }
      }
    };
    updateEmpty();
    registry.onChange('blocks_search_filter', updateEmpty);
  }
};
