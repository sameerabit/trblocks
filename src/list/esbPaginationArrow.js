import '@webcomponents/custom-elements';
import { getBoolean } from 'blocks/utils/configUtil';
import DOMUtil from 'blocks/utils/htmlUtil';
import params from 'blocks/boot/params';

/**
 *
 * @class EsbPaginationArrow
 */
export default class EsbPaginationArrow extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'page', 'icon', 'label'];
  }

  constructor() {
    super();
    this._disabled = true;
    this._page = 0;
    this._label = '';
    this._icon = '';
    this._isConnected = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue) {
      return;
    }
    if (name === 'page') {
      this._page = parseInt(newValue, 10);
    } else if (name === 'disabled') {
      this._disabled = getBoolean(newValue, true);
    } else if (name === 'icon') {
      this._icon = newValue;
    } else if (name === 'label') {
      this._icon = newValue;
    }
    this.redrawItAll();
  }

  connectedCallback() {
    this._isConnected = true;
    this._disabled = getBoolean(this.getAttribute('disabled'), true);
    this._page = parseInt(this.getAttribute('page'), 10);
    this._label = this.getAttribute('label');
    this._icon = this.getAttribute('icon');
    this._useLink = getBoolean(this.getAttribute('link'), false);
    this.redrawItAll();
  }

  disconnectedCallback() {
    this._isConnected = false;
  }

  redrawItAll() {
    if (!this._isConnected) return;
    this.innerText = '';
    let buttonAttributes = { class: 'page-link', 'aria-label': this._label };
    if (this._disabled) {
      buttonAttributes = { ...buttonAttributes, disabled: 'true', 'aria-disabled': 'true' };
    }
    let clickableElement = 'button';
    if (this._useLink) {
      clickableElement = 'a';
      const url = new URL(window.location.href);
      const prefix = params.getParamPrefix();
      url.searchParams.set(`${prefix}page`, (this._page + 1).toString());
      buttonAttributes.href = url.href;
    }
    const button = DOMUtil.create(clickableElement, buttonAttributes, this);
    DOMUtil.create('i', { 'aria-hidden': 'true', class: `fas ${this._icon}` }, button);

    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.dispatchEvent(
        new CustomEvent('arrow-click', {
          bubbles: true,
          composed: true,
          detail: {
            page: this._page,
          },
        })
      );
    });
  }
}
if (window.customElements && !window.customElements.get('esb-pagination-arrow')) {
  window.customElements.define('esb-pagination-arrow', EsbPaginationArrow);
}
