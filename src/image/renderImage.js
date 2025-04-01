import DOMUtil from 'blocks/utils/htmlUtil';
import getEntry from 'blocks/utils/getEntry';
import getTextContent from 'blocks/utils/getTextContent';
import registry from 'blocks/registry';
import utils from '@entryscape/rdforms/src/utils';
import template from 'lodash-es/template';
import md5 from 'md5';
import escape from 'lodash-es/escape';

export default function (node, data) {
  getEntry(data, (entry) => {
    node.innerHTML = '';
    let src;
    if (data.property) {
      const stmts = entry.getAllMetadata().find(entry.getResourceURI(), data.property);
      if (stmts.length > 0) {
        src = stmts[Math.floor(Math.random() * stmts.length)].getValue();
      }
    } else {
      src = entry.getResourceURI();
    }
    if (!src) {
      src = data.fallback;
    }

    const escapedSrc = encodeURIComponent(src);
    const doubleEscapedSrc = encodeURIComponent(escapedSrc);
    if (data.srcTemplate) {
      // srcTemplate = "https://imgproxy.net/?url=http%32%23%23entrystoreredirecter.com%23%45url%22${doubleEscapedSrc}
      // srcTemplate = "${src}?download=false"
      src = template(data.srcTemplate)({src, escapedSrc, doubleEscapedSrc, md5: md5(src)});
    } else if (data.srcTemplateMap) {
      // srcTemplateMap = { "http://data.visitsweden.com/store/": "${src}?cache=enable" }
      Object.keys(data.srcTemplateMap).forEach(key => {
        if (src.includes(key)) {
          const srcTemplate = data.srcTemplateMap[key];
          src = template(srcTemplate)({src, escapedSrc, doubleEscapedSrc, md5: md5(src)});
        }
      });
    }

    let alt;
    if (data.alt) {
      alt = data.alt;
    } else if (data.altproperty) {
      alt = escape(utils.getLocalizedValue(utils.getLocalizedMap(
        entry.getAllMetadata(), entry.getResourceURI(), data.altproperty)).value);
    } else if (data.altcontent) {
      alt = getTextContent(data, entry);
    } else {
      const rdfutils = registry.get('rdfutils');
      alt = rdfutils.getLabel(entry);
    }

    const _node = DOMUtil.create('img', { src, alt });
    node.appendChild(_node);

    _node.onerror = () => {
      if (data.fallback) {
        _node.src = data.fallback;
      }
    };

    if (data.width) {
      _node.style.width = data.width;
    }
    if (data.height) {
      _node.style.height = data.height;
    }
  });
}
