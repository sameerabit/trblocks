import filter from 'blocks/utils/filter';
import limitRadioButtons from 'blocks/search/limitRadioButtons';
import limitSelect from 'blocks/search/limitSelect';

export default function (node, data) {
  filter.guard(node, data.if);
  node.classList.add('esbLimit');
  if (data.type === 'radio') limitRadioButtons(node, data);
  else limitSelect(node, data);
}
