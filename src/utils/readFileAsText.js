import escoProgressTask from 'blocks/migration/nls/escoFile.nls';
import { i18n } from 'esi18n';
import configUtil from './configUtil';
import { convertBytesToMBytes } from './util';

/**
 *
 * @param file
 * @param encoding
 * @returns {Promise}
 */
export default (file, encoding = 'UTF-8') => {
  const fileSizeLimit = configUtil.uploadFileSizeLimit();
  if (file.size > fileSizeLimit) {
    return Promise.reject(
      i18n.localize(escoProgressTask, 'uploadFileSizeLimit', { limit: convertBytesToMBytes(fileSizeLimit) }),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    // reader.onabort = () => callback('abort'); // TODO not supported on IE11?
    reader.readAsText(file, encoding);
  });
};
