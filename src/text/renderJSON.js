import filter from 'blocks/utils/filter';
import error from 'blocks/boot/error';
import template from 'lodash-es/template';

export default (node, data) => {
  filter.guard(node, data.if);

  fetch(data.url).then(d => d.json()).then((loadedData) => {
    if (data.template) {
      node.innerHTML = template(data.template)(loadedData);
    } else if (data.attribute) {
      node.innerHTML = loadedData[data.attribute];
    } else if (typeof data.ondata === 'function') {
      data.ondata(loadedData);
    }
  }).catch((e) => {
    data.error = e.toString();
    error(node, data);
  });
};
