import config from 'blocks/config/config';
import registry from 'blocks/registry';
import { queryToObject, objectToQuery } from 'blocks/utils/browserUtil';
import template from 'lodash-es/template';
import isEqual from 'lodash-es/isEqual';
import { getBoolean } from 'blocks/utils/configUtil';

const URL_TEMPLATE_REGEX = /\${([^}]*)}/g;
const QUERY_PARAM_NAMES = ['entry', 'context', 'uri', 'lookup', 'lookupLiteral', 'lookupURI'];
const URL_PARAMS_PREFIX = config.econfig.hashParamsPrefix || config.econfig.urlParamsPrefix || 'esc_';

let baseFilter;

/**
 * Adds all base parameters, unless they are negatively added to the params.
 * Base parameters may contain a list of multiple values, and some of them may be negatively added in the url,
 * the results are merged.
 */
const appendBaseFilter = (params) => {
  const _params = Object.assign({}, params);
  if (baseFilter) {
    Object.keys(baseFilter).forEach((key) => {
      const toAdd = new Set(baseFilter[key]);
      if (params[`-${key}`]) {
        params[`-${key}`].forEach(noAdd => toAdd.delete(noAdd));
        delete _params[`-${key}`];
      }
      const set = new Set(_params[key] || []);
      toAdd.forEach(p => set.add(p));
      _params[key] = Array.from(set);
    });
  }
  return _params;
};

/**
 * Strips away all values that are given by the baseParams.
 */
const stripBaseFilter = (params) => {
  const _params = Object.assign({}, params);
  if (baseFilter) {
    Object.keys(baseFilter).forEach((key) => {
      const toKeep = new Set(params[key]);
      const supressDefaults = new Set();
      baseFilter[key].forEach(p => {
        if (toKeep.has(p)) {
          toKeep.delete(p);
        } else {
          supressDefaults.add(p);
        }
      });
      if (toKeep.size === 0) {
        delete _params[key];
      } else {
        _params[key] = Array.from(toKeep);
      }
      if (supressDefaults.size > 0) {
        _params[`-${key}`] = Array.from(supressDefaults);
      }
    });
  }
  return _params;
};

/**
 * Extract anny existing query string from path
 *
 * @param {string} path
 * @returns {string}
 */
const getQueryStringFromPath = (path) => {
  if (!path) return '';
  const url = new URL(path, window.location.origin);
  if (url.searchParams.size === 0) return '';
  url.searchParams.delete(`${URL_PARAMS_PREFIX}page`);
  return url.searchParams.toString();
};

/**
 * Returns the search query part to append to the url
 *
 * @param {object} queryParams - Name and value for the query parameters
 * @param {string} path
 * @returns {string}
 * @private
 */
const getQueryString = (queryParams, path) => {
  const blocksSearchUrlParameters = Object.keys(queryParams)
    .filter((paramName) => QUERY_PARAM_NAMES.includes(paramName))
    .reduce((object, key) => ({ ...object, [`${URL_PARAMS_PREFIX}${key}`]: queryParams[key] }), {});
  let otherQueryString = getQueryStringFromPath(path);
  const blocksQueryString = objectToQuery(blocksSearchUrlParameters);
  otherQueryString += otherQueryString && blocksQueryString ? '&' : '';
  return otherQueryString || blocksQueryString ? `?${otherQueryString}${blocksQueryString}` : '';
};

/**
 * Returns the fragment query part to append to the url
 *
 * @param {object} queryParams - Name and value for the query parameters
 * @param {Array<string>} nonFragmentParams - Name of all parameters that are not fragments
 * @returns {string}
 * @private
 */
const getFragmentString = (queryParams, nonFragmentParams = []) => {
  const fragmentUrlParameters = Object.keys(queryParams)
    .filter((paramName) => !nonFragmentParams.includes(paramName))
    .reduce((object, key) => ({ ...object, [`${URL_PARAMS_PREFIX}${key}`]: queryParams[key] }), {});
  const query = objectToQuery(fragmentUrlParameters);
  return query === '' ? '' : `#${query}`;
};

const isTemplateString = (base) => {
  if (base === '') return false;
  return URL_TEMPLATE_REGEX.test(base);
};

/**
 * Returns an array of parameter names that will be used for a url-template
 *
 * @param {string} base - Template containing ${name} where text should be replaced with the value for that parameter
 * @param {object} visibleParams - Parameters that should be part of the url
 * @returns {object}
 */
const stripTemplateParams = (base, visibleParams) => {
  const urlTemplateMatches = base.match(URL_TEMPLATE_REGEX);
  if (urlTemplateMatches) {
    const queryParams = { ...visibleParams };
    urlTemplateMatches.forEach((match) => {
      const parameterName = match.replaceAll(/\${|}$/g, '');
      delete queryParams[parameterName];
    });
    return queryParams;
  }
  return visibleParams;
};

/**
 * Check if page should reload. Returns true if base or path of url has changed
 *
 * @param {URL} newUrl
 * @param {URL} oldUrl
 * @returns {boolean}
 */
const shouldReload = (newUrl, oldUrl) => {
  return newUrl.href.split('#')[0] !== oldUrl.href.split('#')[0];
};

/**
 * Fix for Edge < 79 removing query parameters even when url is ''
 *
 * @param {string} base
 * @param {URL} currentUrl
 * @param {URL} targetUrl
 */
const fixForOldEdge = (base, currentUrl, targetUrl) => {
  if (base === '' && currentUrl.search !== '') {
    currentUrl.searchParams.forEach((value, name) => targetUrl.searchParams.set(name, value));
  }
};

const urlParams = {
  init() {
    baseFilter = config.econfig.baseFilter;
    if (baseFilter) {
// Normalize so baseParams always are arrays.
      Object.keys(baseFilter).forEach((key) => {
        const val = baseFilter[key];
        baseFilter[key] = Array.isArray(val) ? val : [val];
      });
    }
    if (!config.urlParams.entry && !config.urlParams.context) {
      const es = registry.getEntryStore();
      if (window.location.href.indexOf(es.getBaseURI()) === 0) {
        config.urlParams.entry = es.getEntryId(window.location.href);
        config.urlParams.context = es.getContextId(window.location.href);
      }
    }
    config.urlParams = appendBaseFilter(config.urlParams);
    registry.set('urlParams', config.urlParams);
  },
  getLink(base, params) {
    const visibleParams = stripBaseFilter(params);
    const baseIsTemplateString = isTemplateString(base);
    const queryAndFragmentParams = baseIsTemplateString ? stripTemplateParams(base, visibleParams) : visibleParams;
    const path = baseIsTemplateString ? template(base)(visibleParams) : base;
    if (getBoolean(registry.get('blocks_urlQueryParameters'), false)) {
      const queryString = getQueryString(queryAndFragmentParams, path);
      const fragmentString = getFragmentString(queryAndFragmentParams, QUERY_PARAM_NAMES);
      const basePath = path.replace(/[?#].*/, '');
      return basePath + queryString + fragmentString;
    }
    const fragmentString = getFragmentString(queryAndFragmentParams);
    return path + fragmentString;
  },
  setLocation(base, params) {
    const urlString = this.getLink(base, params);
    const currentUrl = new URL(window.location);
    const targetUrl = new URL(urlString, currentUrl.href); // urlString can be relative so base url is needed
    fixForOldEdge(base, currentUrl, targetUrl);
    const reloadPage = shouldReload(targetUrl, currentUrl);
    const targetUrlParams = new URLSearchParams(targetUrl.search);
    targetUrl.search = targetUrlParams.toString();
    if (targetUrl.href === currentUrl.href) return;
    targetUrl.searchParams.delete(`${URL_PARAMS_PREFIX}page`);
    if (reloadPage) {
      window.location = targetUrl.href;
    } else {
      window.history.pushState(window.history.state, '', targetUrl);
    }
  },
  getUrlParams() {
    return registry.get('urlParams');
  },
  getParamPrefix() {
    const prefix = URL_PARAMS_PREFIX;
    return prefix;
  },
  /**
   *  Listener will be called with initial value as well as after subsequent changes.
   */
  addListener(listener) {
    registry.onChange('urlParams', listener, true);
  },
  onInit(listener) {
    registry.onInit('urlParams').then(listener);
  },
};

if (!config.spa) {
  urlParams.init();
}

window.addEventListener('popstate', () => {
  const hashstr = window.location.hash.substring(1);
  // Ignore hash changes from other parts of the webbpage,
  // i.e. changes that does not provide parameters to blocks
  if (hashstr.length > 0 && !hashstr.includes(URL_PARAMS_PREFIX)) {
    return;
  }
  let hasho = {};
  const hash = queryToObject(hashstr);
  Object.keys(hash).forEach((key) => {
    if (key.indexOf(URL_PARAMS_PREFIX) === 0) {
      if (hash[key] && hash[key].includes(',')) {
        hasho[key.substring(URL_PARAMS_PREFIX.length)] = hash[key].split(',');
      } else {
        hasho[key.substring(URL_PARAMS_PREFIX.length)] = [hash[key]];
      }
    }
  });
  hasho = appendBaseFilter(hasho);
  const oldParms = registry.get('urlParams');
  if (oldParms) {
    if (
      !isEqual(oldParms.entry, hasho.entry) ||
      !isEqual(oldParms.context, hasho.context) ||
      !isEqual(oldParms.uri, hasho.uri)
    ) {
      window.location.reload();
    }
  }
  if (!isEqual(registry.get('urlParams'), hasho)) {
    // If both urlParams and page are changed reload is needed no avoid extra query triggered by blocks_filter update
    if (window.location.search.includes(`${URL_PARAMS_PREFIX}page`)) {
      window.location.reload();
    } else {
      registry.set('urlParams', hasho);
    }
  }
});

export default urlParams;
