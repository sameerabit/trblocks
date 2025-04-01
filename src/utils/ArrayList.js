/* eslint-disable class-methods-use-this */
/**
 * Wraps an array (possibly asynchrounous loaded) into a class that looks like a store/List.
 * @see {store/List}
 */
export default class ArrayList {
  /**
   * Parameters may be:
   * arr - an array of entries to be used,
   *      if not provided the loadEntries method must be overrided
   * limit - an integer specifying the page limit.
   *
   * @param {object} params
   */
  constructor(params) {
    this.limit = 20;
    this.entries = params.arr;
    this.limit = params.limit != null ? params.limit : this.limit;
  }

  /**
   * Resets the cached entries, if used the loadEntries method should be properly implemented.
   */
  refresh() {
    delete this.entries;
  }

  /**
   * Implement this method if asynchronous loading of entries is needed.
   * Make sure to store the array of entries in this.entries before
   * the returned promise is resolved.
   *
   * @return {Promise}
   */
  loadEntries() {
  }

  getEntries(page) {
    return new Promise((resolve) => {
      const sliceEntries = arr => arr.slice(page * this.getLimit(), (page + 1) * this.getLimit());
      if (this.entries == null) {
        this.loadEntries().then(entries => resolve(sliceEntries(entries)));
      } else {
        resolve(sliceEntries(this.entries));
      }
    });
  }

  getLimit() {
    return this.limit;
  }

  getSize() {
    return this.entries == null ? -1 : this.entries.length;
  }
}
