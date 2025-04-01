import handlebars from 'blocks/boot/handlebars';
import DOMUtil from 'blocks/utils/htmlUtil';
import getHref from 'blocks/utils/getHref';
import registry from 'blocks/registry';
import escape from 'lodash-es/escape';

const insideLink = (container, element) => {
  let checkElement = element;
  while (container !== checkElement) {
    if (checkElement.tagName === 'A') {
      return true;
    }
    checkElement = checkElement.parentElement;
  }
  return false;
};

/**
 * Structure is:
 *  .esbRow
 *     .esbRowHead
 *        .esbRowMain
 *        .esbRowControl
 *     .esbRowExpand
 *
 */
export default class {
  constructor({ entry, list, rowId }, node) {
    this.conf = list.conf;
    this.conf.templates = this.conf.templates || {};
    this.domNode = node;
    this.entry = entry;
    this.list = list;
    this.parentEntry = list.entry;
    const conf = list.conf;
    this.expandTitle = conf.expandTooltip || '';
    this.unexpandTitle = conf.unexpandTooltip || '';
    this.expandIcon = `fa-${conf.expandIcon || 'chevron-down'}`;
    this.unexpandIcon = `fa-${conf.unexpandIcon || 'chevron-up'}`;
    this.expanded = false;
    this.initialized = false;
    this.expandButtons = [];
    this.rowId = rowId;
    this.expandId = `listExpand-${rowId}`;
    this.strictStandardHtml = registry.get('blocks_strictStandardHtml');
    this.rowIsLink = !!(conf.click || conf.namedclick);

    node.classList.add('esbRow');
    if (conf.padding !== false) {
      node.classList.add('esbPadding');
    }
    if (conf.clickExpand) {
      node.classList.add('esbRowClickExpand');
    }
    let rowHead;
    if (this.rowIsLink && !this.strictStandardHtml) {
      rowHead = this.addClickable(conf, entry, node);
      rowHead.classList.add('esbRowHead');
    } else {
      rowHead = DOMUtil.create('div', { class: 'esbRowHead' }, node);
    }
    let rowMain;
    if (this.rowIsLink && this.strictStandardHtml) {
      rowHead.classList.add('esbNotFocusable');
      rowMain = this.addClickable(conf, entry, rowHead);
      rowMain.classList.add('esbRowMain', 'esbFocusable');
    } else {
      rowMain = DOMUtil.create('div', { class: 'esbRowMain' }, rowHead);
    }
    this.rowExpand = DOMUtil.create('div', { class: 'esbRowExpand', id: this.expandId }, node);
    this.rowExpand.style.display = 'none';

    // Render rowhead
    handlebars.run(rowMain, Object.assign({}, conf, {
      htemplate: (conf.templates && conf.templates.rowhead) || '{{text}}',
      context: entry.getContext().getId(),
      entry: entry.getId(),
      parentEntry: this.parentEntry,
      rowId: this.rowId,
    }), null, entry);

    // Expand on click on anything with the esbExpandButton class set.
    jQuery(rowMain).find('.esbExpandButton').click((function(ev) {
      ev.stopPropagation();
      this.toggle();
    }).bind(this));
    jQuery(rowMain).find('.esbExpandButton').each((idx, el) => {
      this.expandButtons.push(el);
      el.setAttribute('aria-expanded', false);
      el.setAttribute('aria-controls', this.expandId);
    });

    // Add the expand button on the right side of the row, this is the default.
    if (conf.expandButton !== false) {
      rowHead.classList.add('esbDefaultExpandButton');
      const rowControl = DOMUtil.create('div', { class: 'esbRowControl' }, rowHead);
      this.button = DOMUtil.create('button', {
        type: 'button',
        'aria-label': this.getButtonAreaLabel(entry),
        'aria-expanded': false,
        'aria-controls': this.expandId,
        class: 'btn btn-sm btn-link',
      }, rowControl);
      this.expandButtons.push(this.button);
      this.buttonIcon = DOMUtil.create('span', {
        class: `fas fa-fw ${this.expandIcon}`,
        'aria-hidden': true,
      }, this.button);

      const clickNode = conf.clickExpand ? rowHead : this.button;
      jQuery(clickNode).click((function(ev) {
        if (insideLink(ev.currentTarget, ev.target)) {
          return;
        }
        ev.stopPropagation();
        this.toggle();
        return false;
      }).bind(this));
    }
  }

  getButtonAreaLabel(entry) {
    if (this.rowIsLink) return this.expandTitle; // When the button is inside a link Screenreader will read text twice
    const rdfutils = registry.get('rdfutils');
    const label = rdfutils.getLabel(entry) || '';
    return `${escape(label)} ${this.expandTitle}`;
  }

  addClickable(conf, entry, parent) {
    const rowHead = DOMUtil.create('a', { class: 'esbRowLink', href: getHref(conf, entry) }, parent);
    rowHead.onkeydown = (ev) => {
      if (ev.target !== ev.currentTarget) {
        return;
      }
      let closestRowLink;
      switch (ev.keyCode) {
        case 32: // Space
          this.toggle();
          break;
        case 40: // Down
          closestRowLink = ev.target.closest('.esbRow').nextElementSibling.querySelector('.esbRowLink');
          if (closestRowLink) {
            closestRowLink.focus();
          }
          break;
        case 38: // Up
          closestRowLink = ev.target.closest('.esbRow').previousElementSibling.querySelector('.esbRowLink');
          if (closestRowLink) {
            closestRowLink.focus();
          }
          break;
        case 39: // Right
          if (!this.expanded) {
            this.toggle();
          }
          break;
        case 37: // Left
          if (this.expanded) {
            this.toggle();
          }
          break;
        default: break;
      }
    };
    return rowHead;
  }

  toggle() {
    if (!this.initialized) {
      this.initialize();
    }
    if (this.button) {
      this.buttonIcon.classList.toggle(this.expandIcon);
      this.buttonIcon.classList.toggle(this.unexpandIcon);
      this.button.setAttribute('title', this.expanded ? this.expandTitle : this.unexpandTitle);
    }
    if (this.expanded) {
      jquery(this.rowExpand).slideUp(300);
      this.expandButtons.forEach((but) => {
        but.setAttribute('aria-expanded', false);
      });
    } else {
      jquery(this.rowExpand).slideDown(300);
      this.expandButtons.forEach((but) => {
        but.setAttribute('aria-expanded', true);
      });
    }
    this.domNode.classList.toggle('esbRowExpanded');
    this.expanded = !this.expanded;
  }

  initialize() {
    this.initialized = true;
    let htemplate = this.conf.templates.rowexpand;
    // If no explicit rowexpand template is given use
    if (!htemplate) {
      const templ = this.conf.rdformsid || this.conf.template;
      if (templ) {
        const onecol = this.conf.onecol === true;
        htemplate = `{{view rdformsid="${templ}" onecol="${onecol}"}}`;
      } else {
        htemplate = '{{text content="description"}}';
      }
    }

    handlebars.run(this.rowExpand, Object.assign({}, this.conf, {
      htemplate,
      context: this.entry.getContext().getId(),
      entry: this.entry.getId(),
      parentEntry: this.parentEntry,
      rowId: this.rowId,
    }), null, this.entry);
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
