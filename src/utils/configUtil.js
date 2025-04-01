import config from 'config';

const getBaseUrl = () => {
  return config.get('entrystore.repository')
    ? config.get('entrystore.repository').split('/store')[0]
    : window.location.origin;
};

/**
 * @return {string}
 */
const getAppVersion = () => window.sessionStorage.version || 'n/a';

const getStaticUrl = () => config.get('entryscape.static.url');

const getStaticBuild = () => {
  const { app, version = 'stable' } = config.entryscape.static;
  return `${getStaticUrl()}${app}/${version}/`;
};

/**
 * Returns the boolean value (if given as string or boolean) else the defaultValue
 * @param value
 * @param {boolean} defaultValue
 * @return {boolean}
 */
export const getBoolean = (value, defaultValue) => {
  const isValidBoolean = String(value) === 'false' || String(value) === 'true';
  if (isValidBoolean) {
    return String(value) === 'true';
  }
  return defaultValue;
};

const uploadFileSizeLimit = () => config.get('fileUploadSizeLimit', 26214400); // 25 MB

export default {
  getBaseUrl,
  getAppVersion,
  getStaticBuild,
  uploadFileSizeLimit,
  getBoolean,
};
