import '@webcomponents/custom-elements';
import 'blocks/list/esbPaginationArrow';
import { i18n } from 'esi18n';
import escoPagination from 'blocks/migration/nls/escoPagination.nls';

/**
 *
 * @class EsbPagination
 */
export default class EsbPagination extends HTMLElement {
  static get observedAttributes() {
    return ['currentpage', 'totalcount', 'pagesize'];
  }

  constructor() {
    super();
    this._currentPage = 0;
    this._totalCount = 0;
    this._pageSize = 1;
    this._isConnected = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue) {
      return;
    }
    if (name === 'currentpage') {
      this._currentPage = parseInt(newValue, 10);
    } else if (name === 'totalcount') {
      this._totalCount = parseInt(newValue, 10);
    } else if (name === 'pagesize') {
      this._pageSize = parseInt(newValue, 10);
    }
    this.redrawItAll();
  }

  /**
   * Calculate the pagination range. Note that the page range is 0-indexed but we need to show entries from 1
   *
   * @returns {{toCount: number, fromCount: number}}
   */
  getPageRange() {
    const fromCount = !this._currentPage ? 0 : this._currentPage * this._pageSize;
    const toCount = fromCount + this._pageSize < this._totalCount ? fromCount + this._pageSize : this._totalCount;
    return { fromCount: fromCount + 1, toCount };
  }

  connectedCallback() {
    this._isConnected = true;
    this._currentPage = parseInt(this.getAttribute('currentpage'), 10);
    this._totalCount = parseInt(this.getAttribute('totalcount'), 10);
    this._pageSize = parseInt(this.getAttribute('pagesize'), 10);
    this._useLink = this.getAttribute('link');
    this.redrawItAll();
  }

  disconnectedCallback() {
    this._isConnected = false;
  }

  redrawItAll() {
    if (!this._isConnected) return;
    const { fromCount, toCount } = this.getPageRange();
    const paginationText = i18n.localize(escoPagination, 'paginationText', {
      fromCount,
      toCount,
      totalCount: this._totalCount,
    });
    const lastPage = Math.ceil(this._totalCount / this._pageSize) - 1;
    this.innerHTML = `
      <ul class="pagination justify-content-center align-items-center">
      <li class="page-item${!this._currentPage ? ' disabled' : ''}">
        <esb-pagination-arrow
          link=${this._useLink}
          disabled="${!this._currentPage}"
          label="First page"
          page="0"
          icon="fa-angle-double-left"
        ></esb-pagination-arrow>
        </li>  
        <li class="page-item${!this._currentPage ? ' disabled' : ''}">   
        <esb-pagination-arrow
          link=${this._useLink}
          disabled="${!this._currentPage}"
          label="Previous page"
          page="${this._currentPage - 1}"
          icon="fa-angle-left"
        ></esb-pagination-arrow>
        </li>
        <li class="page-item" aria-current="page"><span class="page-text">${paginationText}</span></li>
        <li class="page-item${toCount === this._totalCount ? ' disabled' : ''}">
        <esb-pagination-arrow
          link=${this._useLink}
          disabled="${toCount === this._totalCount}"
          label="Next page"
          page="${this._currentPage + 1}"
          icon="fa-angle-right"
        ></esb-pagination-arrow>
        </li>
        <li class="page-item${toCount === this._totalCount ? ' disabled' : ''}">
        <esb-pagination-arrow
          link=${this._useLink}
          disabled="${toCount === this._totalCount}"
          label="Last page"
          page="${lastPage}"
          icon="fa-angle-double-right"
        ></esb-pagination-arrow>
        </li>
      </ul>
      `;
  }
}
if (window.customElements && !window.customElements.get('esb-pagination')) {
  window.customElements.define('esb-pagination', EsbPagination);
}
