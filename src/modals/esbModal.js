import '@webcomponents/custom-elements';
import DOMUtil from 'blocks/utils/htmlUtil';

/**
 * Modal modals webcomponent with header, content, background and buttons for sending events.
 * To create it do document.createElement('esb-modal').
 * Block config is added by doing element.data({dataObject}).
 * Get the nodes for adding content by element.slotNodes.header and element.slotNodes.content
 * The component emits 'clickOnBackdrop' event and custom button click events for each button.
 * Accessibility attributes for area and buttons.
 * Page scroll is disabled when the modal is added and enabled when it is removed from the page
 *
 * @class EsbModal
 */
export default class EsbModal extends HTMLElement {
  set data(value) {
    this._data = value;
  }

  /**
   * Buttons for controlling the modal. Possible buttons are.
   *
   * @param {Array<'close'|'save'|'cancel'>} buttonNames
   */
  set buttons(buttonNames) {
    this._buttons = this._getButtonsFromNames(buttonNames);
  }

  _getButtonsFromNames(buttonNames) {
    const BUTTONS = {
      close: {
        event: 'clickOnClose',
        attributes: {
          type: 'button',
          class: 'btn btn-sm btn-light esbModalClose',
          'aria-label': 'Close',
          'aria-controls': 'esbModalContainer',
          innerText: this._data.closeButtonText || 'Close',
        },
      },
      cancel: {
        event: 'clickOnCancel',
        attributes: {
          type: 'button',
          class: 'btn btn-sm btn-light esbModalCancel',
          'aria-label': 'Close without saving',
          'aria-controls': 'esbModalContainer',
          innerText: this._data.cancelButtonText || 'Cancel',
        },
      },
      save: {
        event: 'clickOnSave',
        attributes: {
          type: 'button',
          class: 'btn btn-sm btn-secondary esbModalSave',
          'aria-label': 'Close and save',
          'aria-controls': 'esbModalContainer',
          innerText: this._data.saveButtonText || 'Save',
        },
      },
    };
    return buttonNames.map((button) => BUTTONS[button]);
  }

  get slotNodes() {
    const slotNodes = {
      header: this._headerSlotNode,
      content: this._contentSlotNode,
    };
    return slotNodes;
  }

  constructor() {
    super();
    this._contentSlotNode = {};
    this._headerSlotNode = {};
    this._data = {};
    this._buttons = [];
  }

  connectedCallback() {
    const oldWidth = document.body.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.width = `${oldWidth}px`;
    const backDrop = DOMUtil.create(
      'div',
      {
        class: 'esbModal--backDrop',
        'aria-controls': 'esbModalContainer',
      },
      this
    );
    const modalContainer = DOMUtil.create(
      'div',
      {
        id: 'esbModalContainer',
        class: 'esbModal--container',
      },
      this
    );
    this._headerSlotNode = DOMUtil.create(
      'div',
      {
        class: 'esbModal--header',
      },
      modalContainer
    );
    const modalContent = DOMUtil.create(
      'div',
      {
        class: 'esbModal--content',
      },
      modalContainer
    );
    this._contentSlotNode = DOMUtil.create('div', { class: this._data.class || '' }, modalContent);
    const modalFooter = DOMUtil.create('div', { class: 'esbModal--footer' }, modalContainer);

    this._buttons.forEach((button) => {
      const buttonElement = DOMUtil.create('button', button.attributes, modalFooter);
      buttonElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dispatchEvent(
          new CustomEvent(button.event, {
            bubbles: true,
            composed: true,
          })
        );
      });
    });
    backDrop.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === e.currentTarget) {
        this.dispatchEvent(
          new CustomEvent('clickOnBackdrop', {
            bubbles: true,
            composed: true,
          })
        );
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  disconnectedCallback() {
    document.body.style.overflow = null;
    document.body.style.width = 'auto';
  }
}

if (window.customElements && !window.customElements.get('esb-modal')) {
  window.customElements.define('esb-modal', EsbModal);
}
