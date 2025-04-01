import config from 'config';
import { isUri } from './util';
import configUtil from './configUtil';

/**
 * A fallback utility to fetch rdforms templates
 */

const getBaseUrl = () => configUtil.getBaseUrl().replace(/\/?$/, '/');
const getThemeUrl = () => (config.get('itemstore.relativeBundlePath', false) ? '' : `${getBaseUrl()}theme/templates`);
const getBuildTemplateUrl = () => `${configUtil.getStaticBuild()}templates`;

/**
 * NOTE! order matters here
 * @returns {Array<string>}
 */
export const getFallbackUrls = (id, format) => [
  getThemeUrl,
  getBuildTemplateUrl,
].map((baseUrlFunc) => {
  const baseURL = baseUrlFunc();
  if (baseURL === '' && config.get('itemstore.relativeBundlePath', false)) {
    return `${id}.${format}`;
  }
  return `${baseURL}/${id}.${format}`;
});

/**
 * Get an array of fallback urls where a specific bundle may be found.
 * Can be also passed a full url which would ignore the fallback mechanism
 *
 * @param {string} id The id of the bundle or a full url
 * @param {string} [format=json]
 * @return {Array<string>}
 */
export const getFallbackBundleUrls = (id, format = 'json') => (isUri(id) ? [id] : getFallbackUrls(id, format));
