/**
 * Returns an object from a hash string like that provided by
 * window.location.search
 *
 * @param {string} hashString
 * @returns {object}
 */
export const queryToObject = hashString =>
  hashString
    .replace('?', '')
    .split('&')
    .map(keyVal => keyVal.split('='))
    .reduce(
      (accum, keyValPair) => {
        if (keyValPair[0]) {
          accum[keyValPair[0]] = decodeURIComponent(keyValPair[1]);
        }
        return accum;
      },
      {},
    );

const encodeValue = val => (Array.isArray(val) ? val.map(encodeURIComponent).join() : encodeURIComponent(val));

/**
 * Creates an has string useable in a url from an object
 *
 * @param {object} queryObject An object of keys and values
 * @returns {string}
 */
export const objectToQuery = queryObject =>
  Object.entries(queryObject)
    .reduce(
      (accum, keyVal, i) => (i > 0 ? `${accum}&${keyVal[0]}=${encodeValue(keyVal[1])}`
        : `${keyVal[0]}=${encodeValue(keyVal[1])}`),
      '',
    );
