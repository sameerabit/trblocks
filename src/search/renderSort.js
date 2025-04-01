import filter from 'blocks/utils/filter';
import sortSelect from 'blocks/search/sortSelect';
import sortRadioButtons from 'blocks/search/sortRadioButtons';

export default function (node, data) {
  filter.guard(node, data.if);
  node.classList.add('esbSort');
  if (data.type === 'radio') sortRadioButtons(node, data);
  else sortSelect(node, data);
}
