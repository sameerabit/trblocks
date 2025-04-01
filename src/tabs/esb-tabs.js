import '@webcomponents/custom-elements';
import DOMUtil from 'blocks/utils/htmlUtil';
import handlebars from 'blocks/boot/handlebars';
import getTextContent from 'blocks/utils/getTextContent';

/**
 * Tabbed view Web Component. The tab view content is controlled with buttons.
 * Button text is created from a buttonTemplate (fallback to text).
 * Content for the tab view is created from contentTemplate.
 * Entry tou use and templates are added through set tabsConfig method.
 *
 * @class EsbTabs
 */

/**
 * Properties marked with * can be overwritten on a tab level
 *
 * @typedef {object} TabComponentConfig
 * @property {string} buttonClass A class for the buttons
 * @property {string} [buttonTemplate] Content for the buttons defaults to the title if available
 * @property {string} contentTemplate Content for the container
 * @property {object} entry The entry to use for the block
 */

export default class EsbTabs extends HTMLElement {
  constructor() {
    super();
    this._uniqueId = null;
    this._tabsConfigArray = null;
    this._addedContent = new Map();
    this._activeTab = null;
  }

  /**
   * Sets the general data config and tabs specific config containing entry information and other properties needed
   *
   * @param {Array<TabComponentConfig>} tabsConfigArray tabs specific config
   * @param {string} uniqueId for scoping when several tab blocks are added
   */

  initialize(tabsConfigArray, uniqueId) {
    this._tabsConfigArray = tabsConfigArray;
    this._uniqueId = uniqueId;
    if (this.isConnected) {
      this.innerText = '';
      this.createTabs();
    }
  }

  connectedCallback() {
    if (this._tabsConfigArray && this._uniqueId) {
      this.createTabs();
    }
  }

  createTabs() {
    const containerElement = DOMUtil.create(
      'div',
      { class: 'esbTabs__container' },
      this
    );
    const tabListElement = DOMUtil.create(
      'div',
      { class: 'esbTabs__tabList', role: 'tablist' },
      containerElement
    );
    const contentElement = DOMUtil.create(
      'div',
      {
        id: this._uniqueId,
        class: 'esbTabs__content',
      },
      containerElement
    );
    this._tabsConfigArray.forEach((tabConfigObject) => {
      this.addTabButton(tabConfigObject, tabListElement, contentElement);
    });
    const firstButton = tabListElement.querySelector('button');
    firstButton.ariaExpanded = 'true';
    this._activeTab = firstButton;
    this.addContent(this._tabsConfigArray[0], contentElement, firstButton);
  }

  addTabButton(tabConfigObject, tabListElement, contentElement) {
    const buttonElement = DOMUtil.create(
      'button',
      {
        class: tabConfigObject.buttonClass,
        'aria-controls': this._uniqueId,
        'aria-expanded': 'false',
        role: 'tab',
      },
      tabListElement
    );
    if (tabConfigObject.buttonTemplate) {
      handlebars.run(
        buttonElement,
        tabConfigObject,
        tabConfigObject.buttonTemplate,
        tabConfigObject.entry,
        false
      );
    } else {
      buttonElement.innerText = getTextContent(
        tabConfigObject,
        tabConfigObject.entry
      );
    }
    buttonElement.addEventListener('click', (e) => {
      this.updateContent(e, tabConfigObject, contentElement);
    });
  }

  addContent(tabConfigObject, contentElement, activeTab) {
    const addedContentElement = DOMUtil.create('div', {}, contentElement);
    addedContentElement.style.display = 'block';
    this._addedContent.set(activeTab, addedContentElement);
    handlebars.run(
      addedContentElement,
      tabConfigObject,
      tabConfigObject.contentTemplate,
      tabConfigObject.entry,
      false
    );
  }

  updateContent(e, tabConfigObject, contentElement) {
    e.stopPropagation();
    const newActiveTab = e.currentTarget;
    this._addedContent.get(this._activeTab).style.display = 'none';
    this._activeTab.ariaExpanded = 'false';
    if (this._addedContent.has(newActiveTab)) {
      this._addedContent.get(newActiveTab).style.display = 'block';
    } else {
      this.addContent(tabConfigObject, contentElement, newActiveTab);
    }
    newActiveTab.ariaExpanded = 'true';
    this._activeTab = newActiveTab;
  }
}
if (window.customElements && !window.customElements.get('esb-tabs')) {
  window.customElements.define('esb-tabs', EsbTabs);
}