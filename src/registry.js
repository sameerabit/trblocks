/* eslint-disable no-use-before-define */
import PubSub from 'pubsub-js';
import { isEqual, cloneDeep } from 'lodash-es';

const data = new Map();
const bufferedData = new Map();
const bufferedKeys = new Set();
let bufferActive = false;

/**
 * @returns {store/EntryStore}
 */
const getEntryStore = () => exports.get('entrystore');
/**
 * @return {store/EntryStoreUtil}
 */
const getEntryStoreUtil = () => exports.get('entrystoreutil');
/**
 * @returns {store/Entry}
 */
const getEntry = () => exports.get('entry');
/**
 * @return {store/Context}
 */
const getContext = () => exports.get('context');
/**
 * @returns {rdfjson/namespaces}
 */
const getNamespaces = () => exports.get('namespaces');

// App generic registry methods.
const exports = {
  set(key, obj, onlyOnce = false) {
    if (!onlyOnce || (onlyOnce && !data.has(key))) {
      if (bufferActive && bufferedKeys.has(key)) {
        bufferedData.set(key, obj);
      } else {
        data.set(key, obj);
        PubSub.publish(key, obj);
      }
    }
  },
  get(key) {
    if (bufferActive && bufferedKeys.has(key)) {
      return bufferedData.get(key);
    }
    return data.get(key);
  },
  /**
   *
   * @param key
   * @returns {Promise<any>}
   */
  onInit(key) {
    if (data.has(key)) {
      return Promise.resolve(data.get(key));
    }

    return new Promise(r => PubSub.subscribeOnce(key, (msg, obj) => r(obj)));
  },
  /**
   * Call the callback everytime the key is set. Note! the name onSet is more appropriate here, e.g it does not check
   * if the value has actually changed.
   * @param key
   * @param callback
   * @param lastChange if true then calls the callback with the value of key in registry
   * @param onlyOnce if true subscribes only once to a change
   * @returns {String} The pubsub subscription id
   */
  onChange(key, callback, lastChange = false, onlyOnce = false) {
    if (lastChange && data.has(key)) {
      callback(data.get(key));
    }

    const subToken = PubSub.subscribe(key, (msg, obj) => {
      callback(obj);
      if (onlyOnce) {
        PubSub.unsubscribe(subToken);
      }
    });

    return subToken; // not really needed but still return something sensible
  },
  onChangeOnce(key, callback) {
    return this.onChange(key, callback, false, true);
  },

  /**
   * Start buffering changes for specified keys.
   * Each call to beginBuffer needs to be followed by a call to applyBuffer or rollbackBuffer.
   * Only one buffer for each key is allowed. // TODO fix
   * @param {string[]} keys
   */
  beginBuffer(keys) {
    if (bufferActive) {
      throw new Error('Buffer already active');
    }
    bufferActive = true;
    keys.forEach((key) => {
      bufferedKeys.add(key);
      if (data.has(key)) {
        bufferedData.set(key, cloneDeep(data.get(key)));
      }
    });
  },

  /**
   * Apply the changes stored in buffer for specified keys and clears it.
   * @param {string[]} keys
   */
  applyBuffer(keys) {
    if (!bufferActive) {
      throw new Error('Buffer not active');
    }
    keys.forEach((key) => {
      if (!isEqual(bufferedData.get(key), cloneDeep(data.get(key)))) {
        data.set(key, bufferedData.get(key));
      }
    });
    bufferedData.clear();
    bufferedKeys.clear();
    bufferActive = false;
  },

  /**
   * Clears the buffer without applying it
   */
  rollbackBuffer() {
    if (!bufferActive) {
      throw new Error('Buffer not active');
    }
    bufferedData.clear();
    bufferedKeys.clear();
    bufferActive = false;
  },

  getEntryStore,
  getEntryStoreUtil,
  getEntry,
  getContext,
  getNamespaces,
  clearNonPersistantKeys() {
    const persistKey = new Set([
      'entrystore',
      'entrystoreutil',
      'namespaces',
      'itemstore',
      'entrychooser',
      'rdfutils',
      'locale',
      'defaultLocale',
      'localize',
      'clientAcceptLanguages'
    ]);
    data.keys().forEach(key => {
      if (!persistKey.has(key)) {
        data.delete(key);
        PubSub.unsubscribe(key);
      }
    });
//    PubSub.clearAllSubscriptions();
  }
};

export default exports;
