import DOMUtil from 'blocks/utils/htmlUtil';
import filter from 'blocks/utils/filter';
import getEntry from 'blocks/utils/getEntry';
import getHref from 'blocks/utils/getHref';
import getTextContent from 'blocks/utils/getTextContent';

export default (node, data) => {
  filter.guard(node, data.if);

  getEntry(data, (entry) => {
    node.innerHTML = '';
    if (data.property) {
      node.appendChild(DOMUtil.create(
        'a', {
          href: entry.getAllMetadata().findFirstValue(entry.getResourceURI(), data.property),
          innerHTML: getTextContent(data, entry),
        }));
    } else {
      node.appendChild(DOMUtil.create(
        'a', {
          class: `${node.className} ${data.class || ''}`,
          href: getHref(data, entry),
          innerHTML: getTextContent(data, entry),
        },
      ));
      node.className = 'entryscape';
    }
  });
};
