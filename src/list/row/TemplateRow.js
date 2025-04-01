import handlebars from 'blocks/boot/handlebars';
import DOMUtil from 'blocks/utils/htmlUtil';
import getHref from 'blocks/utils/getHref';

export default class {
  constructor({ entry, list, rowId }, node) {
    this.entry = entry;
    this.list = list;
    this.parentEntry = list.entry;
    this.conf = list.conf;
    this.domNode = node;
    this.rowId = rowId;
    const conf = list.conf;
    const layout = list.conf.layout || 'default';
    let rowMain = node;
    if (layout === 'cards') {
      node.classList.add('cardList-body');
      if (conf.click || conf.namedclick) {
        rowMain = DOMUtil.create('a', { class: 'esbRowLink', href: getHref(conf, entry) }, node);
        node.classList.add('esbRowClickable');
      }
    } else if (layout === 'default') {
      node.classList.add('esbRow');
      if (conf.padding !== false) {
        node.classList.add('esbPadding');
      }
      if (conf.click || conf.namedclick) {
        const rowHead = DOMUtil.create('a', { class: 'esbRowHead esbRowLink', href: getHref(conf, entry) }, node);
        rowMain = DOMUtil.create('a', { class: 'esbRowMain' }, rowHead);
        node.classList.add('esbRowClickable');
        rowHead.onkeydown = (ev) => {
          if (ev.target !== ev.currentTarget) {
            return;
          }
          let sibling;
          switch (ev.keyCode) {
            case 40: // Down
              sibling = ev.target.parentElement.nextElementSibling;
              if (sibling && sibling.classList.contains('esbRow')) {
                sibling.firstChild.focus();
              }
              break;
            case 38: // Up
              sibling = ev.target.parentElement.previousElementSibling;
              if (sibling && sibling.classList.contains('esbRow')) {
                sibling.firstChild.focus();
              }
              break;
          }
        };
      } else if (layout === 'swiper') {
        const rowHead = DOMUtil.create('div', { class: 'esbSwiperCardHead' }, node);
        rowMain = DOMUtil.create('div', { class: 'esbSwiperCardMain' }, rowHead);
      } else {
        const rowHead = DOMUtil.create('div', { class: 'esbRowHead' }, node);
        rowMain = DOMUtil.create('div', { class: 'esbRowMain' }, rowHead);
      }
    }

    // Render rowhead
    handlebars.run(rowMain, Object.assign({}, conf, {
      htemplate: (conf.templates && conf.templates.rowhead) || '{{text}}',
      context: entry.getContext().getId(),
      entry: entry.getId(),
      parentEntry: this.parentEntry,
      rowId: this.rowId,
    }), null, entry);
  }
  isChecked() {
    return false;
  }
  updateCheckBox() {
  }
  updateLocaleStrings() {
  }
  destroy() {
    this.domNode.parentNode.removeChild(this.domNode);
  }
}
